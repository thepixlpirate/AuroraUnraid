<?php
// Docker groups hidden by the "Hidden groups" button in the Quick Actions.
//   GET                   returns {"enabled": bool, "names": ["Group", "__ungrouped__", ...]}
//   POST state=<that JSON> stores it
// Unraid checks its csrf_token on every POST before this file runs. The file lives on the
// flash drive, so the choice is the same in every browser and survives reboots.

define('TFT_HIDDEN_FILE', '/boot/config/plugins/Aurora-Theme/hidden-groups.json');

function tft_clean_hidden($data): array
{
    $names = [];
    foreach (is_array($data['names'] ?? null) ? array_slice($data['names'], 0, 200) : [] as $name) {
        if (is_string($name) && $name !== '' && strlen($name) <= 200) $names[] = $name;
    }
    return ['enabled' => !empty($data['enabled']), 'names' => array_values(array_unique($names))];
}

header('Content-Type: application/json');
header('Cache-Control: no-store');

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST') {
    $input = json_decode((string) ($_POST['state'] ?? ''), true);
    if (!is_array($input)) {
        http_response_code(400);
        echo json_encode(['error' => 'state must be a JSON object']);
        exit;
    }
    $state = tft_clean_hidden($input);
    if (!is_dir(dirname(TFT_HIDDEN_FILE))) mkdir(dirname(TFT_HIDDEN_FILE), 0755, true);
    if (file_put_contents(TFT_HIDDEN_FILE, json_encode($state, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n", LOCK_EX) === false) {
        http_response_code(500);
        echo json_encode(['error' => 'could not write ' . TFT_HIDDEN_FILE]);
        exit;
    }
    echo json_encode($state);
    exit;
}

echo json_encode(tft_clean_hidden(json_decode((string) @file_get_contents(TFT_HIDDEN_FILE), true)));
