<?php

declare(strict_types=1);

namespace Envesko\Aryeo;

/**
 * Errors the client raises.
 *
 * The distinctions mirror the TypeScript client exactly, because they are
 * properties of the API rather than of a language. Each exists because a
 * caller was observed doing the wrong thing when the failure arrived as a
 * generic HTTP error: retrying something that will never succeed, or treating
 * an unfiltered collection as a filtered one.
 */
class AryeoException extends \RuntimeException
{
}

/** A non-success response from the API. */
final class HttpException extends AryeoException
{
    /** @param array<string, list<string>> $fields */
    public function __construct(
        public readonly int $status,
        public readonly string $body,
        public readonly string $path,
        public readonly array $fields = [],
    ) {
        parent::__construct(sprintf(
            'Aryeo %d on %s: %s',
            $status,
            $path,
            self::summarise($body, $fields),
        ));
    }

    /**
     * Whether retrying could plausibly help. True only when the API is talking
     * about its own problems. A 404 is never retryable: a record deleted
     * upstream returns one forever.
     */
    public function isRetryable(): bool
    {
        return 429 === $this->status || ($this->status >= 500 && $this->status < 600);
    }

    /** @param array<string, list<string>> $fields */
    private static function summarise(string $body, array $fields): string
    {
        if ([] !== $fields) {
            $parts = [];
            foreach ($fields as $field => $messages) {
                $parts[] = $field.': '.implode(' ', $messages);
            }

            return implode('; ', $parts);
        }

        $trimmed = trim($body);
        if ('' === $trimmed) {
            return 'no response body';
        }

        return mb_strlen($trimmed) > 300 ? mb_substr($trimmed, 0, 300).'...' : $trimmed;
    }
}

/**
 * A record that was known to exist and no longer does. Reconcile rather than
 * retry: it will 404 forever.
 */
final class DeletedUpstreamException extends AryeoException
{
    public function __construct(public readonly string $path)
    {
        parent::__construct(sprintf(
            'The record at %s no longer exists upstream. It was deleted in Aryeo. '.
            'Reconcile your local copy; retrying will return 404 forever.',
            $path,
        ));
    }
}

/** An operation the manifest records as not usable on this generation. */
final class UnavailableOperationException extends AryeoException
{
    public function __construct(string $operationId, string $state, ?string $alternative = null)
    {
        $why = match ($state) {
            'absent' => 'does not exist on this API',
            'unauthorised' => 'is refused for a standard API key',
            default => 'has not been verified and is not callable',
        };

        parent::__construct(
            sprintf('%s %s.', $operationId, $why)
            .(null !== $alternative ? sprintf(' Use %s instead.', $alternative) : '')
        );
    }
}

/**
 * A mutating call with no confirmation. The value has to be read off the
 * target record, which means the caller has to have fetched it.
 */
final class ConfirmationRequiredException extends AryeoException
{
    public function __construct(string $operationId, string $field)
    {
        parent::__construct(sprintf(
            '%s changes data in Aryeo and needs confirmation. Pass confirm set to the target\'s %s.',
            $operationId,
            $field,
        ));
    }
}

/**
 * A parameter the API accepts and then ignores, returning everything. Raised
 * rather than silently dropped, because a caller who passes one believes their
 * result is narrowed.
 */
final class IgnoredFilterException extends AryeoException
{
    public function __construct(string $operationId, string $filter, ?string $useInstead = null)
    {
        parent::__construct(sprintf(
            '%s is not supported on %s. Aryeo accepts it and returns the complete unfiltered '.
            'collection, so passing it would give you results that look filtered and are not.',
            $filter,
            $operationId,
        ).(null !== $useInstead ? sprintf(' Use %s instead.', $useInstead) : ''));
    }
}
