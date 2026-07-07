import fs from "fs";
import net from "net";
import path from "path";

export type ScanResult = {
    status: "clean" | "infected" | "failed";
    engine: string;
    result: string;
};

const CLAMD_HOST = process.env.CLAMD_HOST || "127.0.0.1";
const CLAMD_PORT = Number(process.env.CLAMD_PORT || 3310);
const CLAMD_TIMEOUT_MS = Number(process.env.CLAMD_TIMEOUT_MS || 30000);
const CLAMAV_ENABLED = process.env.CLAMAV_ENABLED !== "false";

const writeChunk = (socket: net.Socket, chunk: Buffer): Promise<void> => {
    return new Promise((resolve, reject) => {
        const header = Buffer.alloc(4);
        header.writeUInt32BE(chunk.length, 0);

        socket.write(Buffer.concat([header, chunk]), (error) => {
            if (error) reject(error);
            else resolve();
        });
    });
};

export const scanFileWithClamd = async (filePath: string): Promise<ScanResult> => {
    if (!CLAMAV_ENABLED) {
        return {
            status: "clean",
            engine: "clamd-disabled",
            result: "ClamAV disabled by CLAMAV_ENABLED=false",
        };
    }

    return new Promise((resolve) => {
        const socket = net.createConnection({ host: CLAMD_HOST, port: CLAMD_PORT });
        const stream = fs.createReadStream(filePath);
        let response = "";
        let settled = false;

        const settle = (result: ScanResult) => {
            if (settled) return;
            settled = true;
            stream.destroy();
            socket.destroy();
            resolve(result);
        };

        socket.setTimeout(CLAMD_TIMEOUT_MS);

        socket.on("connect", () => {
            socket.write("zINSTREAM\0");
            stream.on("data", async (chunk) => {
                stream.pause();
                try {
                    await writeChunk(socket, Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
                    stream.resume();
                } catch (error) {
                    settle({
                        status: "failed",
                        engine: "clamd",
                        result: "Unable to stream file to clamd",
                    });
                }
            });

            stream.on("end", () => {
                socket.write(Buffer.alloc(4));
            });
        });

        socket.on("data", (chunk) => {
            response += chunk.toString("utf8");
        });

        socket.on("end", () => {
            const normalized = response.trim();
            const status = normalized.endsWith("OK")
                ? "clean"
                : normalized.includes("FOUND")
                    ? "infected"
                    : "failed";

            settle({
                status,
                engine: "clamd",
                result: normalized || `No clamd response for ${path.basename(filePath)}`,
            });
        });

        socket.on("timeout", () => {
            settle({
                status: "failed",
                engine: "clamd",
                result: "ClamAV scan timeout",
            });
        });

        socket.on("error", (error) => {
            settle({
                status: "failed",
                engine: "clamd",
                result: error.message,
            });
        });

        stream.on("error", (error) => {
            settle({
                status: "failed",
                engine: "clamd",
                result: error.message,
            });
        });
    });
};

export const pingClamd = async (): Promise<{ healthy: boolean; result: string }> => {
    if (!CLAMAV_ENABLED) {
        return { healthy: false, result: "ClamAV disabled by CLAMAV_ENABLED=false" };
    }

    return new Promise((resolve) => {
        const socket = net.createConnection({ host: CLAMD_HOST, port: CLAMD_PORT });
        let response = "";
        let settled = false;

        const settle = (healthy: boolean, result: string) => {
            if (settled) return;
            settled = true;
            socket.destroy();
            resolve({ healthy, result });
        };

        socket.setTimeout(5000);
        socket.on("connect", () => socket.write("PING\n"));
        socket.on("data", (chunk) => response += chunk.toString("utf8"));
        socket.on("end", () => settle(response.trim() === "PONG", response.trim() || "No response"));
        socket.on("timeout", () => settle(false, "ClamAV ping timeout"));
        socket.on("error", (error) => settle(false, error.message));
    });
};
