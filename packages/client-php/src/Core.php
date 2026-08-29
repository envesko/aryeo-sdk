<?php

declare(strict_types=1);

namespace Envesko\Aryeo;

use Envesko\Aryeo\Generated\Operations;

/**
 * The client core. Drives every call from the generated descriptor table, so
 * adding an operation to the manifest is all it takes to make it callable.
 *
 * The credential exists in this class and nowhere else. A generic error
 * handler that logged a whole failing request, headers included, is how a live
 * API key reached a log table in the codebase this SDK came from, so the token
 * never appears in an exception, a return value or a log line.
 */
final class Core
{
    private const RETRYABLE_CURL = [
        \CURLE_OPERATION_TIMEDOUT,
        \CURLE_COULDNT_CONNECT,
        \CURLE_GOT_NOTHING,
        \CURLE_SEND_ERROR,
        \CURLE_RECV_ERROR,
    ];

    private string $baseUrl;
    private int $maxAttempts;
    private int $baseDelayMs;
    private int $maxDelayMs;
    private int $timeoutSeconds;
    private int $scanMaxPages;

    /** @var (callable(string, string, array<string,string>, ?string): array{status:int, body:string})|null */
    private $sender;

    /**
     * @param array{
     *   baseUrl?: string,
     *   maxAttempts?: int,
     *   baseDelayMs?: int,
     *   maxDelayMs?: int,
     *   timeoutSeconds?: int,
     *   scanMaxPages?: int,
     *   sender?: callable
     * } $options
     */
    public function __construct(private readonly string $apiKey, array $options = [])
    {
        if ('' === $apiKey) {
            throw new \InvalidArgumentException('An Aryeo API key is required.');
        }

        $this->baseUrl = rtrim($options['baseUrl'] ?? Operations::BASE_URL, '/');
        $this->maxAttempts = $options['maxAttempts'] ?? 4;
        $this->baseDelayMs = $options['baseDelayMs'] ?? 500;
        $this->maxDelayMs = $options['maxDelayMs'] ?? 8000;
        $this->timeoutSeconds = $options['timeoutSeconds'] ?? 30;
        $this->scanMaxPages = $options['scanMaxPages'] ?? 20;
        // Injectable so the conformance suite can drive this without HTTP.
        $this->sender = $options['sender'] ?? null;
    }

    /** @param array<string, mixed> $params */
    public function call(string $operationId, array $params = []): Result
    {
        $descriptor = Operations::get($operationId);
        if (null === $descriptor) {
            throw new \InvalidArgumentException(sprintf('Unknown operation %s.', $operationId));
        }

        if ('available' !== $descriptor['availability']) {
            throw new UnavailableOperationException($operationId, $descriptor['availability']);
        }

        if (($descriptor['mutates'] ?? false)
            && !\is_string($params['confirm'] ?? null)) {
            throw new ConfirmationRequiredException($operationId, $descriptor['confirmField'] ?? 'identifier');
        }

        [$path, $used] = $this->buildPath($descriptor['path'], $params);
        $rest = array_diff_key($params, array_flip($used));

        [$query, $clientSide] = $this->buildQuery($operationId, $descriptor, $rest);

        $body = null;
        if ('GET' !== $descriptor['method'] && isset($descriptor['body'])) {
            $body = [];
            foreach ($descriptor['body'] as $key) {
                if (isset($rest[$key])) {
                    $body[$key] = $rest[$key];
                }
            }
        }

        if ([] === $clientSide) {
            $data = $this->request(
                $descriptor['method'],
                $path,
                $query,
                $body,
                [] !== $used && 'GET' === $descriptor['method'],
            );

            return new Result($data, ['serverSideFiltered' => true]);
        }

        return $this->scan($operationId, $descriptor, $path, $query, $clientSide);
    }

    /**
     * Walk pages applying the filters the API will not, and say exactly what
     * was covered. Returning an unfiltered page as though it were filtered is
     * the failure this SDK exists to prevent.
     *
     * @param array<string, mixed>  $descriptor
     * @param array<string, string> $query
     * @param array<string, mixed>  $clientSide
     */
    private function scan(
        string $operationId,
        array $descriptor,
        string $path,
        array $query,
        array $clientSide,
    ): Result {
        $perPage = $descriptor['perPageMax'] ?? Operations::PER_PAGE_MAX;
        $matched = [];
        $scanned = 0;
        $pages = 0;
        $lastPage = 1;

        for ($page = 1; $page <= $this->scanMaxPages; ++$page) {
            $response = $this->request(
                'GET',
                $path,
                $query + ['page' => (string) $page, 'per_page' => (string) $perPage],
                null,
                false,
            );

            $items = $response['data'] ?? [];
            $scanned += \count($items);
            $pages = $page;
            $lastPage = $response['meta']['last_page'] ?? $page;

            foreach ($items as $item) {
                foreach ($clientSide as $name => $value) {
                    if (!self::matches($item, $name, $value)) {
                        continue 2;
                    }
                }
                $matched[] = $item;
            }

            if ($page >= $lastPage || [] === $items) {
                break;
            }
        }

        $truncated = $lastPage > $pages;
        $names = array_keys($clientSide);

        return new Result($matched, [
            'serverSideFiltered' => false,
            'appliedInClient' => $names,
            'recordsScanned' => $scanned,
            'recordsMatched' => \count($matched),
            'pagesScanned' => $pages,
            'scanLimit' => $this->scanMaxPages * $perPage,
            'truncated' => $truncated,
            'note' => sprintf(
                'Aryeo does not filter %s by %s, so it was applied here over a bounded scan.%s',
                $operationId,
                implode(', ', $names),
                $truncated
                    ? ' The scan reached its bound before the collection ended, so this result is INCOMPLETE.'
                    : '',
            ),
        ]);
    }

    /**
     * @param array<string, mixed> $params
     *
     * @return array{0: string, 1: list<string>}
     */
    private function buildPath(string $template, array $params): array
    {
        $used = [];
        $path = preg_replace_callback('/\{(\w+)\}/', static function (array $m) use ($params, &$used): string {
            $key = $m[1];
            if (!isset($params[$key]) || '' === $params[$key]) {
                throw new \InvalidArgumentException(sprintf('Missing path parameter %s.', $key));
            }
            $used[] = $key;

            return rawurlencode((string) $params[$key]);
        }, $template);

        return [(string) $path, $used];
    }

    /**
     * @param array<string, mixed> $descriptor
     * @param array<string, mixed> $params
     *
     * @return array{0: array<string, string>, 1: array<string, mixed>}
     */
    private function buildQuery(string $operationId, array $descriptor, array $params): array
    {
        $query = [];
        $clientSide = [];
        $filters = $descriptor['filters'] ?? [];

        foreach ($params as $name => $value) {
            if (null === $value || \in_array($name, ['include', 'sort', 'page', 'perPage', 'confirm'], true)) {
                continue;
            }

            if (isset($filters[$name])) {
                $filter = $filters[$name];

                if ('rejected' === $filter['state']) {
                    throw new IgnoredFilterException($operationId, $name, $filter['useInstead'] ?? null);
                }

                if ('ignored' === $filter['state']) {
                    // Never send it: the API would take it and return everything.
                    if ('client-side' === ($filter['strategy'] ?? null)) {
                        $clientSide[$name] = $value;

                        continue;
                    }

                    throw new IgnoredFilterException($operationId, $name, $filter['useInstead'] ?? null);
                }

                if (!isset($filter['wire'])) {
                    continue;
                }

                if (\is_array($value)) {
                    foreach (array_values($value) as $i => $item) {
                        $query[sprintf('%s[%d]', $filter['wire'], $i)] = self::filterValue($item);
                    }
                } else {
                    $query[$filter['wire']] = self::filterValue($value);
                }

                continue;
            }

            if (\in_array($name, $descriptor['params'] ?? [], true)) {
                $query[$name] = (string) $value;
            }
        }

        if (\is_array($params['include'] ?? null) && [] !== $params['include']) {
            $query['include'] = implode(',', $params['include']);
        }
        if (\is_string($params['sort'] ?? null)) {
            $query['sort'] = $params['sort'];
        }
        if (\is_int($params['page'] ?? null)) {
            $query['page'] = (string) $params['page'];
        }
        if (\is_int($params['perPage'] ?? null)) {
            // Asking for more is accepted and silently capped upstream, so
            // promising a larger page would be a lie the API tells quietly.
            $max = $descriptor['perPageMax'] ?? Operations::PER_PAGE_MAX;
            $query['per_page'] = (string) min($params['perPage'], $max);
        }

        return [$query, $clientSide];
    }

    /**
     * Lowercase an enum value, but never a date or timestamp. Lowercasing
     * 2026-08-10T00:00:00Z produces a corrupted window rather than an error.
     */
    private static function filterValue(mixed $value): string
    {
        if (!\is_string($value)) {
            return \is_bool($value) ? ($value ? 'true' : 'false') : (string) $value;
        }

        return preg_match('/^\d{4}-\d{2}-\d{2}([T ]|$)/', $value) ? $value : mb_strtolower($value);
    }

    /** @param array<string, string> $query */
    private function request(
        string $method,
        string $path,
        array $query,
        ?array $body,
        bool $expectExisting,
    ): array {
        $url = $this->baseUrl.$path.([] !== $query ? '?'.http_build_query($query) : '');
        $payload = null !== $body ? json_encode($body, \JSON_UNESCAPED_SLASHES | \JSON_THROW_ON_ERROR) : null;

        $lastException = null;

        for ($attempt = 1; $attempt <= $this->maxAttempts; ++$attempt) {
            $headers = [
                'Authorization' => 'Bearer '.$this->apiKey,
                'Accept' => 'application/json',
            ];
            if (null !== $payload) {
                $headers['Content-Type'] = 'application/json';
            }

            $result = $this->send($method, $url, $headers, $payload);
            $status = $result['status'];
            $responseBody = $result['body'];

            if ($status >= 200 && $status < 300) {
                if ('' === $responseBody) {
                    return [];
                }

                return json_decode($responseBody, true, 512, \JSON_THROW_ON_ERROR);
            }

            if (404 === $status && $expectExisting) {
                throw new DeletedUpstreamException($path);
            }

            $exception = new HttpException($status, $responseBody, $path, self::fieldErrors($responseBody));

            if (!$exception->isRetryable() || $attempt === $this->maxAttempts) {
                throw $exception;
            }

            $lastException = $exception;
            usleep(min($this->baseDelayMs * 2 ** ($attempt - 1), $this->maxDelayMs) * 1000);
        }

        throw $lastException ?? new AryeoException('Request failed with no response.');
    }

    /**
     * @param array<string, string> $headers
     *
     * @return array{status: int, body: string}
     */
    private function send(string $method, string $url, array $headers, ?string $payload): array
    {
        if (null !== $this->sender) {
            return ($this->sender)($method, $url, $headers, $payload);
        }

        $handle = curl_init($url);
        if (false === $handle) {
            throw new AryeoException('Could not initialise an HTTP request.');
        }

        $flat = [];
        foreach ($headers as $key => $value) {
            $flat[] = $key.': '.$value;
        }

        $options = [
            \CURLOPT_RETURNTRANSFER => true,
            \CURLOPT_TIMEOUT => $this->timeoutSeconds,
            \CURLOPT_CUSTOMREQUEST => $method,
            \CURLOPT_HTTPHEADER => $flat,
        ];
        if (null !== $payload) {
            $options[\CURLOPT_POSTFIELDS] = $payload;
        }
        curl_setopt_array($handle, $options);

        $raw = curl_exec($handle);
        $status = (int) curl_getinfo($handle, \CURLINFO_RESPONSE_CODE);
        $errno = curl_errno($handle);
        curl_close($handle);

        if (false === $raw) {
            // Deliberately no request detail in the message: it would carry
            // the Authorization header.
            throw new AryeoException(\in_array($errno, self::RETRYABLE_CURL, true)
                ? 'Aryeo transport failure, retryable.'
                : 'Aryeo transport failure.');
        }

        return ['status' => $status, 'body' => (string) $raw];
    }

    /**
     * Aryeo puts validation detail under `data` as {field: [message]}, with no
     * top-level message. Without pulling it out, every 422 reads as an
     * unexplained "unprocessable entity".
     *
     * @return array<string, list<string>>
     */
    private static function fieldErrors(string $body): array
    {
        try {
            $parsed = json_decode($body, true, 512, \JSON_THROW_ON_ERROR);
        } catch (\JsonException) {
            return [];
        }

        if (!\is_array($parsed) || !isset($parsed['data']) || !\is_array($parsed['data'])) {
            return [];
        }

        $out = [];
        foreach ($parsed['data'] as $field => $messages) {
            if (!\is_string($field)) {
                continue;
            }
            $list = array_values(array_filter(
                \is_array($messages) ? $messages : [$messages],
                static fn ($m) => \is_string($m),
            ));
            if ([] !== $list) {
                $out[$field] = $list;
            }
        }

        return $out;
    }

    /** Compare a caller value against a record field, including nested ids. */
    private static function matches(mixed $item, string $name, mixed $value): bool
    {
        if (!\is_array($item)) {
            return false;
        }

        // listingId -> listing.id, orderId -> order.id, and so on.
        if (str_ends_with($name, 'Id')) {
            $relation = self::toSnake(substr($name, 0, -2));
            if (\is_array($item[$relation] ?? null)) {
                return ($item[$relation]['id'] ?? null) === $value;
            }
        }

        $direct = $item[self::toSnake($name)] ?? null;
        if (\is_string($direct) && \is_string($value)) {
            return mb_strtolower($direct) === mb_strtolower($value);
        }

        return $direct === $value;
    }

    private static function toSnake(string $value): string
    {
        return strtolower((string) preg_replace('/([A-Z])/', '_$1', $value));
    }
}
