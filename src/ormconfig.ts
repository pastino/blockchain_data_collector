import { ConnectionOptions } from "typeorm";

export const ormconfig: ConnectionOptions = {
  type: "mysql",
  host: process.env.HOST,
  port: Number(process.env.MYSQL_PORT),
  username: process.env.USERNAME,
  password: process.env.PASSWORD,
  database: process.env.DATABASE,
  synchronize: true,
  logging: ["warn", "error"],
  charset: "utf8mb4_unicode_ci",
  entities: [__dirname + "/entities/*.*"],
  migrations: [__dirname + "/migrations/*.*"],
  subscribers: [__dirname + "/subscribers/*.*"],
  cli: {
    entitiesDir: __dirname + "/entities",
    migrationsDir: "/src/migrations",
    subscribersDir: __dirname + "/subscribers",
  },
};

export default ormconfig;
