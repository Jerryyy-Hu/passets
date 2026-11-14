import {createAccountService} from '../server/account-service.mjs';
import {GitHubRepositoryStore} from '../server/repository-store.mjs';

const secret=process.env.PASSETS_DATA_SECRET||'',token=process.env.PASSETS_GITHUB_TOKEN||'';
const store=secret&&token?new GitHubRepositoryStore({secret,token,repository:process.env.PASSETS_REPOSITORY||'Jerryyy-Hu/passets',branch:process.env.PASSETS_DATA_BRANCH||'passets-data'}):null;
const handle=createAccountService({secret,store,allowedOrigins:(process.env.PASSETS_ALLOWED_ORIGINS||'https://jerryyy-hu.github.io').split(',').map(origin=>origin.trim())});
export default {fetch:handle};
