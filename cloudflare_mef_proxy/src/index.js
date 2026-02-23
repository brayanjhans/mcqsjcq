export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);

        // Si alguien entra a la raíz, muestra un mensaje
        if (url.pathname === "/") {
            return new Response("MEF Proxy is running", { status: 200 });
        }

        // Construir la URL destino en el MEF
        const targetUrl = "https://ssi.mef.gob.pe" + url.pathname + url.search;

        // Clonar la petición original
        const newRequest = new Request(targetUrl, {
            method: request.method,
            headers: request.headers,
            body: request.body,
            redirect: 'manual'
        });

        // Inyectar headers para intentar evadir el bloqueo
        newRequest.headers.set('Host', 'ssi.mef.gob.pe');
        newRequest.headers.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        newRequest.headers.set('Accept', 'application/json, text/plain, */*');
        newRequest.headers.set('Accept-Language', 'es-PE,es;q=0.9,en-US;q=0.8,en;q=0.7');

        try {
            // Hacer la llamada al MEF
            const response = await fetch(newRequest);

            // Devolver la respuesta exactamente como vino del MEF
            return new Response(response.body, {
                status: response.status,
                statusText: response.statusText,
                headers: response.headers
            });
        } catch (e) {
            return new Response("Error proxying request: " + e.message, { status: 500 });
        }
    },
};
