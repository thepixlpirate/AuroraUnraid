<?php
// Ports of the containers that Unraid's Docker tab leaves without a "LAN IP:Port":
//   - host network (Jellyfin, Homebridge, ...): Unraid shows the server's address and "all"
//   - routed through another container (network "container:nordlynx"): Unraid shows nothing,
//     because the ports are published on the other container
// For both, the ports come from the container's template (its "Port" settings).
//   GET returns {"host": "192.168.1.5", "containers": {"qbittorrent": {"mode": "routed",
//        "running": true, "ports": [{"host": "8080", "target": "8080", "proto": "tcp"}]}}}
// Other containers are left out: Unraid's list is complete for them.

$docroot = $_SERVER['DOCUMENT_ROOT'] ?: '/usr/local/emhttp';
require_once "$docroot/plugins/dynamix.docker.manager/include/DockerClient.php";

header('Content-Type: application/json');
header('Cache-Control: no-store');

$result = ['host' => DockerUtil::host(), 'containers' => new stdClass()];
$containers = [];
try {
    $client = new DockerClient();
    $templates = new DockerTemplates();
    foreach ($client->getDockerContainers() as $ct) {
        $name = (string) ($ct['Name'] ?? '');
        $mode = (string) ($ct['NetworkMode'] ?? '');
        $kind = $mode === 'host' ? 'host' : (strpos($mode, 'container:') === 0 ? 'routed' : '');
        if ($name === '' || $kind === '') continue;
        $ports = [];
        $path = $templates->getUserTemplate($name);
        $xml = ($path && is_file($path)) ? @simplexml_load_file($path) : false;
        if ($xml) {
            foreach ($xml->Config as $config) {
                if ((string) $config['Type'] !== 'Port') continue;
                $target = trim((string) $config['Target']);
                $value = trim((string) $config) !== '' ? trim((string) $config) : trim((string) $config['Default']);
                // On the host network the container listens on its own ports; routed, the
                // ports are the ones published on the other container.
                $port = $kind === 'host' ? ($target !== '' ? $target : $value) : ($value !== '' ? $value : $target);
                if (!preg_match('/^\d+(-\d+)?$/', $port)) continue;
                $proto = strtolower(trim((string) $config['Mode'])) === 'udp' ? 'udp' : 'tcp';
                $ports[] = ['host' => $port, 'target' => $target !== '' ? $target : $port, 'proto' => $proto];
            }
        }
        $containers[$name] = ['mode' => $kind, 'running' => !empty($ct['Running']), 'ports' => $ports];
    }
} catch (Throwable $error) {
    // The Docker service is not running: nothing to add.
}
if ($containers) $result['containers'] = $containers;
echo json_encode($result);
