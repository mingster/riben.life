//export { auth as middleware } from "@/auth"

//Protect all routes
//https://next-auth.js.org/configuration/nextjs#middleware
import { type NextRequest, NextResponse } from "next/server";
//export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};

// specify the path regex to apply the middleware to
//export const config = {
//This ensures that any route other than those for the register, login, and api directories will be protected.
//matcher: ['/((?!register|api|signin/#).*)'],
//matcher: ['/((?!register|signin/#).*)'],
//};

// the list of all allowed origins
const furls = process.env.FRONTEND_URLS;

//allow localhost:3000 if in development mode
const allowedOrigins =
  process.env.NODE_ENV === "production"
    ? (furls?.split(",") as string[])
    : ["http://localhost:3000", "https://api.stripe.com"];

const badRequest = new NextResponse(null, {
  status: 400,
  statusText: "Bad Request",
  headers: { "Content-Type": "text/plain" },
});

export function middleware(req: NextRequest) {
  // retrieve the current response
  const res = NextResponse.next();

  // Add a new header x-current-path which passes the path to downstream components
  res.headers.set("x-current-path", req.nextUrl.pathname);

  // CORS apply only to api routes
  //
  const regex = /\/api\/*/;
  if (regex.test(req.url)) {
    const origin = req.headers.get("origin");
    //console.log('origin: ' + origin);

    //this will block api tools like postman or thunderclient
    //if ((origin && !allowedOrigins.includes(origin)) || !origin) {
    if (origin && !allowedOrigins.includes(origin)) {
      return badRequest;
    }

    // if the origin is an allowed one,
    // add it to the 'Access-Control-Allow-Origin' header
    if (origin && furls) {
      const allowedOrigins = furls.split(",") as string[];
      if (allowedOrigins.includes(origin)) {
        res.headers.append("Access-Control-Allow-Origin", origin);

        res.headers.append("Access-Control-Allow-Credentials", "true");
        res.headers.append(
          "Access-Control-Allow-Methods",
          "POST, PUT, PATCH, GET, DELETE, OPTIONS",
        );

        // add the remaining CORS headers to the response
        res.headers.append("Content-Type", "application/json");
        res.headers.append("Allow", "GET, POST, PATCH, OPTIONS");

        //Access-Control-Allow-Headers: Origin, X-Api-Key, X-Requested-With, Content-Type, Accept, Authorization
        res.headers.append(
          "Access-Control-Allow-Headers",
          "Origin, X-Api-Key, X-Requested-With, Content-Type, Accept, Authorization",
        );

        //res.headers.append(
        //'Access-Control-Allow-Headers',
        //'Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Authorization, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers',
        //);

        //console.log('allow origin: ' + origin);
      }
    }
  }

  return res;
}
