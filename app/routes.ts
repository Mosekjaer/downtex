import { type RouteConfig, index, layout, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),

  // Auth routes
  route("login", "routes/_auth.login.tsx"),
  route("callback", "routes/_auth.callback.tsx"),

  // App shell (authenticated, pathless layout)
  layout("routes/_app.tsx", [
    index("routes/_app._index.tsx"),
    route("settings", "routes/_app.settings.tsx"),

    // Workspace layout with nested children
    route("workspace/:wid", "routes/_app.workspace.$wid.tsx", [
      route("settings", "routes/_app.workspace.$wid.settings.tsx"),
      route("folder/:folderId", "routes/_app.workspace.$wid.folder.$folderId.tsx"),
      route(":docId", "routes/_app.workspace.$wid.$docId.tsx"),
    ]),
  ]),

  // API routes
  route("api/export/:docId", "routes/api.export.$docId.tsx"),
  route("api/github-repos", "routes/api.github-repos.tsx"),
  route("api/github-tree/:repoId", "routes/api.github-tree.$repoId.tsx"),
  route("api/render-figure/:figureId", "routes/api.render-figure.$figureId.tsx"),
  route("api/search-documents", "routes/api.search-documents.tsx"),
  route("api/snapshot/:docId", "routes/api.snapshot.$docId.tsx"),

  // Public routes
  route("render/:docId", "routes/render.$docId.tsx"),
  route("share/:token", "routes/share.$token.tsx"),
] satisfies RouteConfig;
