const dns = require("dns");

function configureDns() {
  try {
    dns.setDefaultResultOrder?.("ipv4first");
    dns.setServers(["8.8.8.8", "8.8.4.4"]);
  } catch (error) {
    console.warn("DNS bootstrap warning:", error.message);
  }
}

module.exports = { configureDns };
