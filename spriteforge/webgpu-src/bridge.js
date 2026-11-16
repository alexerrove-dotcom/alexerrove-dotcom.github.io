import { Txt2ImgWorkerClient } from 'web-txt2img';
import { env } from '@xenova/transformers';
env.allowLocalModels = false;
env.allowRemoteModels = true;
env.remoteHost = 'https://huggingface.co/';
env.remotePathTemplate = '{model}/resolve/{revision}/';
env.useBrowserCache = true;
export function createClient(){return Txt2ImgWorkerClient.createDefault()}
