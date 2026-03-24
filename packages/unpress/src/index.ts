#!/usr/bin/env node

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createUnpressServer } from "./server.js";
import { config } from "dotenv";

config();

const baseDir = process.cwd();
const { server } = createUnpressServer(baseDir);
const transport = new StdioServerTransport();
await server.connect(transport);
