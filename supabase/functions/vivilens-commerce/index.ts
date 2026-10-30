import {createCommerceHandler} from './handler.mjs';
Deno.serve(createCommerceHandler({env:Deno.env,fetch:globalThis.fetch}));
