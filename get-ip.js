const os = require('os');

function getLocalIp() {
  const nets = os.networkInterfaces();
  let candidate = null;

  for (const name of Object.keys(nets)) {
    const isVirtual = /virtual|vethernet|vmware|loopback/i.test(name);
    for (const net of nets[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        if (!candidate && !isVirtual) {
          candidate = net.address;
        }
        // Prioritize Wi-Fi or Ethernet
        if (/wi-fi|wifi|ethernet|inalámbrica|inalambrica/i.test(name) && !isVirtual) {
          return net.address;
        }
      }
    }
  }

  return candidate || 'localhost';
}

console.log(getLocalIp());
