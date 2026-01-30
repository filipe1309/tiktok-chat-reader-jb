import path from 'path';
import express, { Application, Request, Response } from 'express';
import { createServer, Server as HttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { SocketHandler } from '../handlers';
import { RateLimiterService, StatisticsService } from '../../application/services';
import { SocketEventType } from '../../domain/enums';

/**
 * Server Configuration
 */
export interface ServerConfig {
  port: number;
  sessionId?: string;
  enableRateLimit: boolean;
  staticFilesPath: string;
  corsOrigin: string;
  statisticsIntervalMs: number;
}

const DEFAULT_CONFIG: ServerConfig = {
  port: 8081,
  enableRateLimit: false,
  staticFilesPath: path.join(__dirname, '../../../public'),
  corsOrigin: '*',
  statisticsIntervalMs: 5000,
};

/**
 * HTTP and WebSocket Server
 */
export class HttpSocketServer {
  private readonly app: Application;
  private readonly httpServer: HttpServer;
  private readonly io: SocketIOServer;
  private statisticsInterval: NodeJS.Timeout | null = null;

  constructor(
    private readonly config: ServerConfig = DEFAULT_CONFIG,
    private readonly rateLimiterService: RateLimiterService,
    private readonly statisticsService: StatisticsService
  ) {
    this.app = express();
    this.httpServer = createServer(this.app);
    this.io = new SocketIOServer(this.httpServer, {
      cors: {
        origin: config.corsOrigin,
      },
    });

    this.setupMiddleware();
    this.setupSocketHandlers();
    this.setupStatisticsBroadcast();
  }

  /**
   * Start the server
   */
  start(): void {
    this.httpServer.listen(this.config.port, () => {
      console.info(`Server running! Please visit http://localhost:${this.config.port}`);
    });
  }

  /**
   * Stop the server
   */
  stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.statisticsInterval) {
        clearInterval(this.statisticsInterval);
        this.statisticsInterval = null;
      }

      this.io.close((err) => {
        if (err) {
          reject(err);
          return;
        }

        // Only close if server is listening
        if (!this.httpServer.listening) {
          resolve();
          return;
        }

        this.httpServer.close((err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });
    });
  }

  /**
   * Get the Express app instance (for testing)
   */
  getApp(): Application {
    return this.app;
  }

  /**
   * Get the Socket.IO server instance (for testing)
   */
  getIO(): SocketIOServer {
    return this.io;
  }

  /**
   * Set up Express middleware
   */
  private setupMiddleware(): void {
    // Serve static files
    this.app.use(express.static(this.config.staticFilesPath));
  }

  /**
   * Set up Socket.IO connection handlers
   */
  private setupSocketHandlers(): void {
    this.io.on('connection', (socket) => {
      new SocketHandler(
        socket,
        this.rateLimiterService,
        this.statisticsService,
        this.config.sessionId
      );
    });
  }

  /**
   * Set up statistics broadcast interval
   */
  private setupStatisticsBroadcast(): void {
    this.statisticsInterval = setInterval(() => {
      this.io.emit(SocketEventType.STATISTIC, this.statisticsService.getStatistics());
    }, this.config.statisticsIntervalMs);
  }
}
