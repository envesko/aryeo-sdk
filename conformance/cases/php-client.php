<?php

declare(strict_types=1);

/**
 * Conformance cases for the PHP client.
 *
 * Deliberately the same claims as the TypeScript suite, because the promise is
 * that the two clients behave identically. Where a case here reads differently
 * from its TypeScript counterpart, that is a parity bug.
 *
 * No test framework: this runs anywhere PHP does, which matters for a package
 * whose users may not share our toolchain.
 *
 *   php conformance/cases/php-client.php
 */

use Envesko\Aryeo\AryeoException;
use Envesko\Aryeo\Client;
use Envesko\Aryeo\Core;
use Envesko\Aryeo\Generated\OrdersResource;
use Envesko\Aryeo\Generated\TasksResource;
use Envesko\Aryeo\IgnoredFilterException;
use Envesko\Aryeo\UnavailableOperationException;

$root = \dirname(__DIR__, 2);
foreach (glob($root.'/packages/client-php/src/*.php') as $file) {
    require_once $file;
}
foreach (glob($root.'/packages/client-php/src/Generated/*.php') as $file) {
    require_once $file;
}

$passed = 0;
$failed = 0;

function check(string $name, bool $ok): void
{
    global $passed, $failed;
    if ($ok) {
        ++$passed;
        echo "  ok   {$name}\n";
    } else {
        ++$failed;
        echo "  FAIL {$name}\n";
    }
}

/** @param callable():mixed $fn */
function throws(callable $fn, string $class): bool
{
    try {
        $fn();

        return false;
    } catch (\Throwable $e) {
        return $e instanceof $class;
    }
}

function makeClient(array $rows = [], ?array &$seen = null): Client
{
    $seen = [];
    $sender = function (string $method, string $url, array $headers, ?string $payload) use (&$seen, $rows): array {
        $seen[] = ['url' => $url, 'headers' => $headers, 'method' => $method];

        return [
            'status' => 200,
            'body' => json_encode(['data' => $rows, 'meta' => ['last_page' => 1]]),
        ];
    };

    return new Client(new Core('test-key', ['sender' => $sender, 'baseDelayMs' => 1]));
}

echo "filters reach the wire in the form the API honours\n";
$aryeo = makeClient([], $seen);
$aryeo->orders()->list(
    search: '6453',
    userIds: ['aaa', 'bbb'],
    appointmentStartAtGte: '2026-08-10T00:00:00Z',
    paymentStatus: 'PAID',
    perPage: 500,
);
$query = urldecode($seen[0]['url']);

check('sends filters bracketed', str_contains($query, 'filter[search]=6453'));
check('never sends a filter flat', !str_contains($query, '&search=6453'));
check('serialises lists indexed', str_contains($query, 'filter[user_ids][0]=aaa'));
check('lowercases enum values', str_contains($query, 'filter[payment_status]=paid'));
// Lowercasing this would send 2026-08-10t00:00:00z and corrupt the window.
check('never lowercases a timestamp', str_contains($query, '2026-08-10T00:00:00Z'));
check('caps per_page at the ceiling', str_contains($query, 'per_page=100'));

echo "\na filter the API ignores never reaches the wire\n";
$parameters = array_map(
    static fn (\ReflectionParameter $p): string => $p->getName(),
    (new \ReflectionMethod(TasksResource::class, 'list'))->getParameters(),
);
check('unsupported filter is not even an argument', !\in_array('orderId', $parameters, true));

$aryeo = makeClient([], $seen);
check(
    'runtime refuses it by name',
    throws(static fn () => $aryeo->core()->call('tasks.list', ['orderId' => 'abc']), IgnoredFilterException::class),
);
check('nothing was requested', [] === $seen);

$aryeo = makeClient([
    ['id' => '1', 'listing' => ['id' => 'wanted']],
    ['id' => '2', 'listing' => ['id' => 'other']],
], $seen);
$result = $aryeo->orders()->list(listingId: 'wanted');
check('client-side filter narrows the result', 1 === \count($result->data));
check('and says it was not server side', !$result->isServerSideFiltered());
check('and names what it applied', ['listingId'] === $result->meta['appliedInClient']);
check('and reports what it scanned', 2 === $result->meta['recordsScanned']);
check('and did not send the filter', !str_contains(urldecode($seen[0]['url']), 'filter[listing_id]'));

echo "\noperations the API will not serve\n";
$aryeo = makeClient([], $seen);
check(
    'absent route explains itself',
    throws(static fn () => $aryeo->core()->call('payroll.runs.list'), UnavailableOperationException::class),
);
check(
    'unauthorised route explains itself',
    throws(
        static fn () => $aryeo->core()->call('payroll.items.get', ['payRunItemId' => 'x']),
        UnavailableOperationException::class,
    ),
);
check('neither reached the network', [] === $seen);

echo "\nmutating calls need confirmation\n";
$aryeo = makeClient([], $seen);
check(
    'a write with no confirmation is refused',
    throws(
        static fn () => $aryeo->core()->call('orders.tags.add', ['orderId' => 'o', 'tagId' => 't']),
        AryeoException::class,
    ),
);
check('and nothing was requested', [] === $seen);

echo "\ncredentials\n";
$aryeo = makeClient([], $seen);
$aryeo->orders()->list();
check('sends the key as a bearer', 'Bearer test-key' === $seen[0]['headers']['Authorization']);

echo "\nparity with the TypeScript surface\n";
$methods = 0;
foreach (glob($root.'/packages/client-php/src/Generated/*Resource.php') as $file) {
    $class = 'Envesko\\Aryeo\\Generated\\'.basename($file, '.php');
    $methods += \count(get_class_methods($class)) - 1;
}
$manifest = json_decode(file_get_contents($root.'/manifest/generations/v1.json'), true, 512, \JSON_THROW_ON_ERROR);
$available = \count(array_filter(
    $manifest['operations'],
    static fn (array $op): bool => 'available' === $op['availability']['state'],
));
check(
    sprintf('one method per available operation (%d of %d)', $methods, $available),
    $methods === $available,
);
check('orders resource exists with a list method', method_exists(OrdersResource::class, 'list'));

echo "\n{$passed} passed, {$failed} failed\n";
exit($failed > 0 ? 1 : 0);
