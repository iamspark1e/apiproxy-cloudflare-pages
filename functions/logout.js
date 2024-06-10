export function onRequestGet(context) {
    return new Response("<p>Logged out. <a href='/index.html'>Redirect to Index</a></p>", { status: 401, headers: {
        "Content-Type": "text/html"
    } });
}