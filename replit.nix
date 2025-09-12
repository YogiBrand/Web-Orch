{ pkgs }: {
  deps = [
    pkgs.nodejs-20_x
    pkgs.nodePackages.npm
    pkgs.git
  ];
  
  env = {
    NODE_ENV = "development";
    REPLIT_ENV = "true";
    HOST = "0.0.0.0";
    PORT = "5173";
  };
}