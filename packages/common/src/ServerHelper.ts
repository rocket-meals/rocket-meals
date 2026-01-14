export type ServerConfig = {
  server_url: string;
};

export class ServerHelper {
  public static TEST_SERVER_CONFIG: ServerConfig = {
    server_url: 'https://test.rocket-meals.de/rocket-meals/api',
  };

  public static SWOSY_SERVER_CONFIG: ServerConfig = {
    server_url: 'https://swosy.rocket-meals.de/rocket-meals/api',
  };

  public static STUDI_FUTTER_SERVER_CONFIG: ServerConfig = {
    server_url: 'https://studi-futter.rocket-meals.de/rocket-meals/api',
  };

  public static SERVER_CONFIG_MUENSTER: ServerConfig = {
    server_url: 'https://muenster.rocket-meals.de/rocket-meals/api',
  };
}
