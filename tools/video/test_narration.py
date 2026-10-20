import importlib.util
import io
from pathlib import Path
import tempfile
import unittest
from unittest.mock import Mock, patch
import json

spec=importlib.util.spec_from_file_location('presentation_video',Path(__file__).with_name('video.py'))
video=importlib.util.module_from_spec(spec);spec.loader.exec_module(video)

class NarrationTests(unittest.TestCase):
    def test_auto_and_override(self):
        with patch.dict(video.os.environ,{},clear=True):
            self.assertEqual(video.select_backend('auto'),'local')
        with patch.dict(video.os.environ,{'ELEVENLABS_API_KEY':'fixture'},clear=True):
            self.assertEqual(video.select_backend('auto'),'elevenlabs')
            self.assertEqual(video.select_backend('local'),'local')
    def test_cloud_request_and_output_contract_without_paid_call(self):
        class Response:
            def __enter__(self):return self
            def __exit__(self,*args):pass
            def read(self,_size):return b'fixture audio'
        def synthesize(request,timeout):
            self.assertEqual(request.get_header('Xi-api-key'),'fixture')
            self.assertEqual(json.loads(request.data)['text'],'Hello')
            self.assertEqual(timeout,60)
            return Response()
        def transcode(command):
            Path(command[-1]).write_bytes(b'fixture wav')
        with tempfile.TemporaryDirectory() as directory,patch.dict(video.os.environ,{'ELEVENLABS_API_KEY':'fixture'},clear=True),patch.object(video.urllib.request.OpenerDirector,'open',side_effect=synthesize),patch.object(video,'run',side_effect=transcode):
            output=Path(directory)/'voice.wav';video.elevenlabs_speech('Hello',output)
            self.assertEqual(output.read_bytes(),b'fixture wav')
            self.assertFalse(output.with_suffix('.mp3').exists())
    def test_media_children_do_not_receive_service_keys(self):
        with patch.dict(video.os.environ,{'ELEVENLABS_API_KEY':'fixture','CLERK_SECRET_KEY':'fixture','OPENAI_API_KEY':'fixture','PATH':'/usr/bin'},clear=True),patch.object(video.subprocess,'run') as run:
            video.run(['ffmpeg','fixture'])
            self.assertNotIn('ELEVENLABS_API_KEY',run.call_args.kwargs['env'])
            self.assertNotIn('CLERK_SECRET_KEY',run.call_args.kwargs['env'])
            self.assertIs(run.call_args.kwargs['shell'],False)
    def test_voice_ids(self):
        for value in ['JBFqnCBsd6RMkjVDRZzb','a','A0'*32]:
            self.assertEqual(video.voice_id(value),value)
        for value in ['', 'a'*65, '../voice', 'voice?query', 'voice#fragment', 'voice/name', 'voice_name', 'voice\n', 'é']:
            with self.subTest(value=value),self.assertRaises(ValueError):video.voice_id(value)
    def test_invalid_voice_never_fetches(self):
        with patch.dict(video.os.environ,{'ELEVENLABS_API_KEY':'fixture','ELEVENLABS_VOICE_ID':'../voice'},clear=True),patch.object(video,'fetch') as fetch:
            with self.assertRaises(ValueError):video.elevenlabs_speech('Hello',Path('unused.wav'))
            fetch.assert_not_called()
    def test_download_urls(self):
        for url in ['https://api.elevenlabs.io/v1/text-to-speech/voice','https://huggingface.co/model?download=true']:
            self.assertEqual(video.fetch_host(url),video.urllib.parse.urlsplit(url).hostname)
        for url in ['http://huggingface.co/model','file:///etc/passwd','ftp://huggingface.co/model','https://127.0.0.1/model','https://huggingface.co.evil.test/model','https://evil.test@huggingface.co/model','https://huggingface.co:8443/model','https://huggingface.co/model\n',' https://huggingface.co/model','https://cdn-lfs.hf.co/model']:
            with self.subTest(url=url),self.assertRaises(ValueError):video.fetch_host(url)
    def test_huggingface_https_redirect_chain(self):
        handler=video.DownloadRedirect()
        request=video.urllib.request.Request(video.VOICE_URL+'.onnx')
        for url in ['https://cdn-lfs.huggingface.co/model','https://cdn-lfs.hf.co/model','https://cdn-lfs-us-1.hf.co/model','https://cas-bridge.xethub.hf.co/model?signature=fixture']:
            request=handler.redirect_request(request,None,302,'Found',{},url)
            self.assertEqual(request.full_url,url)
    def test_unsafe_redirects_and_cross_service_credentials(self):
        handler=video.DownloadRedirect()
        sources=[video.VOICE_URL,'https://cas-bridge.xethub.hf.co/model','https://api.elevenlabs.io/v1/text-to-speech/voice']
        for source in sources:
            for target in ['http://huggingface.co/model','file:///etc/passwd','https://localhost/model','https://169.254.169.254/model','https://cdn-lfs.hf.co.evil.test/model','https://user@cdn-lfs.hf.co/model']:
                with self.subTest(source=source,target=target),self.assertRaises(ValueError):
                    handler.redirect_request(video.urllib.request.Request(source),None,302,'Found',{},target)
        for source,target in [(sources[0],sources[2]),(sources[2],sources[0]),(sources[2],'https://cas-bridge.xethub.hf.co/model')]:
            with self.subTest(source=source,target=target),self.assertRaises(ValueError):
                handler.redirect_request(video.urllib.request.Request(source,headers={'xi-api-key':'fixture'}),None,302,'Found',{},target)
        request=video.urllib.request.Request(sources[2],headers={'xi-api-key':'fixture'})
        redirected=handler.redirect_request(request,None,302,'Found',{},sources[2]+'?format=mp3')
        self.assertEqual(redirected.get_header('Xi-api-key'),'fixture')
    def test_fetch_rejects_url_before_opening(self):
        with patch.object(video.urllib.request,'build_opener') as build:
            with self.assertRaises(ValueError):video.fetch('file:///etc/passwd',10)
            build.assert_not_called()
    def test_fetch_caps_response_size(self):
        for body,limit in [(b'audio',5),(b'too large',5)]:
            response=io.BytesIO(body);opener=Mock();opener.open.return_value=response
            with self.subTest(body=body),patch.object(video.urllib.request,'build_opener',return_value=opener) as build:
                if len(body)>limit:
                    with self.assertRaisesRegex(RuntimeError,'too large'):video.fetch(video.VOICE_URL,limit)
                else:self.assertEqual(video.fetch(video.VOICE_URL,limit),body)
                self.assertIsInstance(build.call_args.args[0],video.DownloadRedirect)
                opener.open.assert_called_once_with(video.VOICE_URL,timeout=60)
                self.assertTrue(response.closed)
    def test_installer_caps_model_and_config_downloads(self):
        with tempfile.TemporaryDirectory() as directory,patch.object(video,'ROOT',Path(directory)),patch.object(video,'run'),patch.object(video,'fetch',side_effect=[b'model',b'config']) as fetch,patch.object(video,'VOICE_SHA',video.hashlib.sha256(b'model').hexdigest()),patch('builtins.print'):
            video.install_local()
            self.assertEqual(fetch.call_args_list[0].args,(video.VOICE_URL+'.onnx',100_000_000))
            self.assertEqual(fetch.call_args_list[1].args,(video.VOICE_URL+'.onnx.json',1_000_000))
    def test_macos_say_reads_text_file(self):
        text='-v Alex\nHello, café'
        def synthesize(command):
            if command[0]=='say':
                self.assertEqual(command[3],'-f')
                self.assertEqual(Path(command[4]).read_text(encoding='utf-8'),text)
                self.assertNotIn(text,command)
                Path(command[2]).write_bytes(b'aiff')
            else:Path(command[-1]).write_bytes(b'wav')
        with tempfile.TemporaryDirectory() as directory,patch.object(video,'local_model',return_value=Path(directory)/'missing.onnx'),patch.object(video.platform,'system',return_value='Darwin'),patch.object(video.shutil,'which',return_value='/usr/bin/say'),patch.object(video,'run',side_effect=synthesize) as run:
            output=Path(directory)/'voice.wav'
            self.assertEqual(video.local_speech(text,output),'macos-say')
            self.assertEqual(output.read_bytes(),b'wav')
            self.assertFalse(Path(run.call_args_list[0].args[0][4]).exists())
    def test_profile_names_match_launcher(self):
        for value in ['dev','demo-2','a_b','0','a'*32]:
            self.assertEqual(video.profile_name(value),value)
        for value in ['', '../dev','/tmp/dev','a/b','Dev','-dev','_dev','a'*33,'dev\n','é']:
            with self.subTest(value=value),self.assertRaises(ValueError):video.profile_name(value)
    def test_runtime_profile_and_symlink_containment(self):
        with tempfile.TemporaryDirectory() as directory,patch.object(video,'ROOT',Path(directory)):
            root=Path(directory);profile=root/'.local/dev';profile.mkdir(parents=True)
            (profile/'runtime.json').write_text(json.dumps({'status':'ready','urls':{'web':'https://fixture.ts.net'}}))
            self.assertEqual(video.runtime_url('dev'),'https://fixture.ts.net')
            for value in ['../dev','/tmp/dev']:
                with self.subTest(value=value),self.assertRaises(ValueError):video.runtime_url(value)
            (root/'.local/escape').symlink_to(root,target_is_directory=True)
            with self.assertRaises(ValueError):video.runtime_url('escape')
            (profile/'runtime.json').unlink();(profile/'runtime.json').symlink_to(root/'outside.json')
            with self.assertRaises(ValueError):video.runtime_url('dev')
        with tempfile.TemporaryDirectory() as directory,tempfile.TemporaryDirectory() as outside,patch.object(video,'ROOT',Path(directory)):
            (Path(outside)/'dev').mkdir();(Path(outside)/'dev/runtime.json').write_text(json.dumps({'status':'ready','urls':{'web':'https://other'}}))
            (Path(directory)/'.local').symlink_to(outside,target_is_directory=True)
            with self.assertRaises(ValueError):video.runtime_url('dev')
    def test_capture_media_containment(self):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory);output=root/'output';cache=root/'cache'
            output.mkdir();cache.mkdir()
            scene={'id':'scene-1','video':str(output/'video.webm'),'audio':str(cache/'voice.wav')}
            with patch.object(video,'CACHE',cache):
                self.assertEqual(video.capture_scene(scene,output),scene)
                self.assertEqual(video.capture_scene({**scene,'audio':str(output/'voice.wav')},output)['audio'],str(output/'voice.wav'))
                (output/'escape').symlink_to(root,target_is_directory=True)
                for field in ['video','audio']:
                    for path in [root/'outside',output/'../outside',output/'escape/outside','https://evil.test/media','file:///etc/passwd',output]:
                        with self.subTest(field=field,path=path),self.assertRaises(ValueError):
                            video.capture_scene({**scene,field:str(path)},output)
                with self.assertRaises(ValueError):video.capture_scene({**scene,'video':str(cache/'video.webm')},output)
                with self.assertRaises(ValueError):video.capture_scene({**scene,'id':'../escape'},output)

if __name__=='__main__':unittest.main()
