# envesko/aryeo-php

Typed PHP client for the [Aryeo](https://www.aryeo.com) real estate media platform. PHP 8.1 and up, no framework required.

Generated from a description of the API that records how each endpoint actually responds, so the arguments you are offered are the ones that work. The surface matches the TypeScript client method for method.

```bash
composer require envesko/aryeo-php
```

```php
use Envesko\Aryeo\Client;

$aryeo = Client::create($_ENV['ARYEO_API_TOKEN']);

// every shoot booked this week, with the photographer attached
$shoots = $aryeo->orders()->list(
    appointmentStartAtGte: '2026-08-10T00:00:00Z',
    appointmentStartAtLte: '2026-08-17T00:00:00Z',
    include: ['listing', 'customer', 'appointments.users'],
);
```

## What it handles

Each endpoint expands a different set of relationships, and the valid names are not always the obvious ones.

Some parameters are accepted by the API and then ignored, returning the complete collection. Those are never sent, and are not generated as arguments at all. Where one can be applied locally the client does so and reports what it scanned:

```php
$result = $aryeo->orders()->list(listingId: $listingId);
$result->isServerSideFiltered();      // false
$result->meta['recordsScanned'];      // how far it looked
$result->isTruncated();               // true means the result is incomplete
```

Retries cover rate limits, server errors and network timeouts. A record deleted upstream throws `DeletedUpstreamException` rather than being retried forever.

Anything that changes data requires you to echo an identifier off the target record, so it cannot fire by accident.

## Documentation

Full coverage, the API notes behind it and the TypeScript equivalent: [envesko/aryeo-sdk](https://github.com/envesko/aryeo-sdk).

This repository is a read-only mirror. Issues and pull requests belong on the main repository.

MIT, copyright Envesko. An independent project, not affiliated with Aryeo.
