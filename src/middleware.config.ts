// Middleware configuration
export const config = {
  // Run middleware on all routes except static files and images
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
}; 