export type ServerConfig = {
  server_url: string;
};

export class ServerHelper {
  public static readonly TEST_SERVER_CONFIG: ServerConfig = {
    server_url: 'https://test.rocket-meals.de/rocket-meals/api',
  };

  public static readonly SWOSY_SERVER_CONFIG: ServerConfig = {
    server_url: 'https://swosy.rocket-meals.de/rocket-meals/api',
  };

  public static readonly STUDI_FUTTER_SERVER_CONFIG: ServerConfig = {
    server_url: 'https://studi-futter.rocket-meals.de/rocket-meals/api',
  };

  // Web-only tenant (no native app yet), served from the central repository
  // under https://rocket-meals.de/rocket-meals/darmstadt/.
  public static readonly DARMSTADT_SERVER_CONFIG: ServerConfig = {
    server_url: 'https://darmstadt.rocket-meals.de/rocket-meals/api',
  };

  public static readonly SERVER_CONFIG_MUENSTER: ServerConfig = {
    server_url: 'https://muenster.rocket-meals.de/rocket-meals/api',
  };
}
