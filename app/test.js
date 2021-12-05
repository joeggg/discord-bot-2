'use strict';
const stream = require('youtube-audio-stream');
const fs = require('fs');
const lame = require('@suldashi/lame');
const Speaker = require('speaker');
const { decode } = require('punycode');
const speaker = new Speaker({
    channels: 2,          // 2 channels
    bitDepth: 16,         // 16-bit samples
    sampleRate: 44100     // 44,100 Hz sample rate
});
const decoder = new lame.Decoder({

});
async function start() {
    decoder.pipe(speaker);
    try {
        for await (const chunk of stream(
            'https://www.youtube.com/watch?v=hBkcwy-iWt8&t=389s',
            {
                o: '-',
                q: '',
                r: '8M',
            }
        )) {
            decoder.write(chunk);
        }
    } catch (err) {
        console.log(err);
    }
}
start();
console.log('hi');
