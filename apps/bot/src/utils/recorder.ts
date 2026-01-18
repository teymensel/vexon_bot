import { EndBehaviorType, VoiceReceiver } from '@discordjs/voice';
import { User } from 'discord.js';
import fs from 'fs';
import path from 'path';
import * as prism from 'prism-media';
import { pipeline } from 'stream';
import ffmpeg from 'ffmpeg-static';
import { spawn } from 'child_process';

export class AudioRecorder {
    private receiver: VoiceReceiver;

    constructor(receiver: VoiceReceiver) {
        this.receiver = receiver;
    }

    startRecording(user: User, durationMs: number = 5 * 60 * 1000): Promise<string> {
        return new Promise((resolve, reject) => {
            console.log(`Starting recording for ${user.tag}`);

            const opusStream = this.receiver.subscribe(user.id, {
                end: {
                    behavior: EndBehaviorType.Manual,
                },
            });

            const filename = `recording-${user.username}-${Date.now()}.mp3`;
            const outputPath = path.resolve(__dirname, `../../recordings/${filename}`);

            // Ensure dir exists
            const dir = path.dirname(outputPath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            // Decode Opus to PCM
            const opusDecoder = new prism.opus.Decoder({ frameSize: 960, channels: 2, rate: 48000 });

            // Spawn ffmpeg to encode PCM to MP3
            const ffmpegProcess = spawn(ffmpeg as string, [
                '-f', 's16le',       // Input format: Signed 16-bit Little Endian
                '-ar', '48000',      // Input sample rate: 48kHz
                '-ac', '2',          // Input channels: 2 (Discord default)
                '-i', 'pipe:0',      // Input from stdin
                '-b:a', '128k',      // Audio bitrate: 128k
                '-y',                // Overwrite output
                outputPath           // Output file
            ]);

            // Error handling for ffmpeg
            ffmpegProcess.stderr.on('data', (data) => {
                // console.log(`ffmpeg stderr: ${data}`); // Verbose logging
            });

            ffmpegProcess.on('close', (code) => {
                console.log(`ffmpeg process exited with code ${code}`);
                if (code === 0) {
                    resolve(outputPath);
                } else {
                    reject(new Error(`ffmpeg exited with code ${code}`));
                }
            });

            // Pipeline: Opus Stream -> Decoder -> FFmpeg Stdin
            pipeline(opusStream, opusDecoder, ffmpegProcess.stdin, (err) => {
                if (err) {
                    console.error('Pipeline failed:', err);
                    // reject(err) // Don't reject here instantly, let ffmpeg close handle it or destroy streams
                }
            });

            // Stop logic
            setTimeout(() => {
                console.log(`Stopping recording for ${user.tag} after timeout.`);
                opusStream.destroy();
                opusDecoder.destroy();
                if (ffmpegProcess.stdin.writable) {
                    ffmpegProcess.stdin.end(); // Close ffmpeg input to finish encoding
                }
            }, durationMs);
        });
    }
}
