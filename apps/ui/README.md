# Deployment workflow

The SPA implemented by this package references itself inside an `iframe` to achieve isolation of `PrivyProvider` instances. The second instance of the SPA is running from a different `origin` controlled (not directly defined) by `VITE_HOSTNAME_ALIAS` variable.

Each of these SPA instances works with the same API (backend service) but due to the nature of cross-domain environment, they need to "see" a dedicated CNAME alias to that API when deployed in production. This necessity implies a mechanism for on-fly evaluation of the `baseURL` property of the `axios` instance as present in `apps/ui/src/axios.ts` The mechanism is based on the fact that for the **local development**, the cross-domain constraints are not applicable and so one api URL can be defined via `VITE_API_BASE_URL` variable.

But for the deployed version of SPA the `baseURL` gets evaluated based on the `location.hostname` of the active SPA instance by pre-pending it with `api.`. 

Examples of the DNS records to be created (for production deployment):
- Main SPA: `example.com` CNAME-ed to SPA's CDN, e.g. `my-spa.onrender.com`
- Aliased SPA: `alias.example.com` CNAME-ed to SPA's CDN `my-spa.onrender.com`. Also a value of `VITE_HOSTNAME_ALIAS` variable
- API for main SPA: `api.example.com` CNAME-ed to deployed server, e.g. `my-api.onrender.com`
- API for the aliased SPA: `api.alias.example.com` CNAME-ed to `my-api.onrender.com`
- Value of `VITE_API_BASE_URL` to be cleared (undefined)
 