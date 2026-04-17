import re, os, asyncio, edge_tts
async def main():
    with open('animation_tts.md', 'r', encoding='utf-8') as f: content = f.read()
    blocks = re.findall(r'`	ext\s*(.*?)\s*`', content, re.DOTALL)
    run_dir = r'd:\\AnotherMe-V3\\OpenMAIC\\anotherme2_engine\\gateway_data\\runs\\problem-video-zaf8e6gt\\run_output\\rerender_job'
    for i in range(min(8, len(blocks))):
        text = blocks[i].strip(); filename = f'narration_{i:03d}'
        with open(os.path.join(run_dir, 'texts', f'{filename}.txt'), 'w', encoding='utf-8') as f: f.write(text)
        await edge_tts.Communicate(text, "zh-CN-XiaoxiaoNeural").save(os.path.join(run_dir, 'raw', f'{filename}.mp3'))
        print(f'Generated {filename}')
if __name__ == "__main__": asyncio.run(main())
