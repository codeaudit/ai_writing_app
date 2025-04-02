
{ pkgs }: {
  deps = [
    pkgs.vim
    pkgs.nodejs
    pkgs.nodePackages.typescript
    pkgs.nodePackages.typescript-language-server
  ];
}
