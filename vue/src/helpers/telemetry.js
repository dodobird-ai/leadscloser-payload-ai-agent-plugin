import { $api } from "@/services/api";

class Telemetry {
  constructor(source_url) {
    if (!source_url) {
      try {
        const url = new URL(window.location.href);
        source_url = url.protocol + "//" + url.host;
      } catch (err) {
        console.warn("No telemetry source_url");
      }
    }
    this.source_url = source_url;
  }

  async send(data) {
    await $api.backend.telemetry.makeRequest({
      method: "put",
      data,
    });
  }

  getTs() {
    return new Date().toISOString();
  }
  printFailure(err) {
    console.warn("failed to send telemetry: ", err);
  }

  async log({ source, message }, metadata) {
    try {
      await this.send({
        timestamp: this.getTs(),
        type: "INFO",
        source: source,
        source_url: this.source_url,
        message: message,
        metadata,
      });
    } catch (err) {
      this.printFailure(err);
    }
  }

  async debug({ source, message }, metadata) {
    try {
      await this.send({
        timestamp: this.getTs(),
        type: "DEBUG",
        source: source,
        source_url: this.source_url,
        message: message,
        metadata,
      });
    } catch (err) {
      this.printFailure(err);
    }
  }

  async error(err, metadata) {
    try {
      // TODO: deal with err
      await this.send({
        timestamp: this.getTs(),
        type: "ERROR",
        source: "",
        source_url: this.source_url,
        message: `${err.message}: ${err.stack}`,
        metadata,
      });
    } catch (err) {
      this.printFailure(err);
    }
  }
}

export default Telemetry;
