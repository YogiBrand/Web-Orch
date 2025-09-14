{ pkgs }: {
  deps = [
    pkgs.nodejs-18_x
    pkgs.nodePackages.npm
    pkgs.nodePackages.pnpm
    pkgs.docker
    pkgs.docker-compose
    pkgs.postgresql
    pkgs.redis
    pkgs.nginx
    pkgs.python3
    pkgs.python3Packages.pip
    pkgs.chromium
    pkgs.xvfb-run
    pkgs.vnc
  ];
  
  env = {
    NODE_ENV = "development";
    REPLIT_ENV = "true";
  };
}