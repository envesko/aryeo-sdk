<?php

declare(strict_types=1);

namespace Envesko\Aryeo;

/**
 * What came back, and what the client did to get it.
 *
 * The meta is not decoration. When a filter had to be applied here rather than
 * upstream, this is where a caller learns that the result was scanned rather
 * than queried, and whether the scan covered everything.
 */
final class Result implements \JsonSerializable
{
    /** @param array<string, mixed> $meta */
    public function __construct(
        public readonly mixed $data,
        public readonly array $meta = [],
    ) {
    }

    /** True when every filter was applied by the API. */
    public function isServerSideFiltered(): bool
    {
        return true === ($this->meta['serverSideFiltered'] ?? null);
    }

    /**
     * True when a scan hit its bound before the collection ended. The result is
     * then incomplete and must not be presented as the whole set.
     */
    public function isTruncated(): bool
    {
        return true === ($this->meta['truncated'] ?? null);
    }

    /** @return array<string, mixed> */
    public function jsonSerialize(): array
    {
        return ['data' => $this->data, 'meta' => $this->meta];
    }
}
