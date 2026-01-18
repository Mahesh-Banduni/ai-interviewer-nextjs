import { NextResponse } from "next/server";
import { SarvamAIClient } from "sarvamai";

export async function POST(req) {
  try {
    const { text, voice } = await req.json();

    if (!text) {
      return NextResponse.json({ error: "Missing text" }, { status: 400 });
    }

    const client = new SarvamAIClient({
      apiSubscriptionKey: process.env.SARVAM_API_KEY
    });

    const response = await client.textToSpeech.convert({
      text,
      target_language_code: "en-IN",
      speaker: "hitesh",
      pitch: 0,
      pace: 1,
      loudness: 1,
      speech_sample_rate: 22050,
      enable_preprocessing: true,
      model: "bulbul:v2"
    });

    if (!response?.audios?.length) {
      console.error("Sarvam returned no audio", response);
      return NextResponse.json({ error: "No audio returned" }, { status: 500 });
    }

    const audioBase64 = response.audios[0];
    const audioBuffer = Buffer.from(audioBase64, "base64");

    return new NextResponse(audioBuffer, {
      headers: {
        "Content-Type": "audio/wav",
        "Content-Disposition": 'inline; filename="sarvam_output.wav"',
      },
    });

  } catch (error) {
    console.error("SARVAM TTS ERROR:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// import { NextResponse } from "next/server";
// import { GoogleGenAI } from "@google/genai";
// import wav from "wav";
// import { PassThrough } from "stream";

// /**
//  * Converts raw PCM data into a valid WAV file stream.
//  */
// function pcmToWav(pcmBuffer, channels = 1, sampleRate = 24000, bitDepth = 16) {
//   const writer = new wav.Writer({
//     channels,
//     sampleRate,
//     bitDepth,
//   });

//   const stream = new PassThrough();
//   writer.pipe(stream);
//   writer.write(pcmBuffer);
//   writer.end();

//   return stream;
// }

// export async function POST(req) {
//   try {
//     const { text, voice } = await req.json();

//     if (!text) {
//       return NextResponse.json({ error: "Missing text input" }, { status: 400 });
//     }

//     const ai = new GoogleGenAI({
//       apiKey: process.env.GEMINI_API_KEY1,
//     });

//     // 🧠 Call Gemini TTS model
//     const response = await ai.models.generateContent({
//       model: "gemini-2.5-flash-preview-tts",
//       contents: [{ parts: [{ text }] }],
//       config: {
//         responseModalities: ["AUDIO"],
//         speechConfig: {
//           voiceConfig: {
//             prebuiltVoiceConfig: { voiceName: voice || "Charon" },
//           },
//         },
//       },
//     });

//     const inlineData = response?.candidates?.[0]?.content?.parts?.[0]?.inlineData;

//     if (!inlineData?.data) {
//       console.error("Gemini TTS: No audio data found", response);
//       return NextResponse.json({ error: "No audio data returned" }, { status: 500 });
//     }

//     const audioBuffer = Buffer.from(inlineData.data, "base64");

//     // 🧩 Convert PCM → playable WAV stream
//     const wavStream = pcmToWav(audioBuffer);

//     // ✅ Send back a real WAV file
//     return new NextResponse(wavStream, {
//       headers: {
//         "Content-Type": "audio/wav",
//         "Content-Disposition": 'inline; filename="output.wav"',
//       },
//     });
//   } catch (error) {
//     console.error("Gemini TTS Error:", error);
//     return NextResponse.json(
//       { error: error.message || "Internal server error" },
//       { status: 500 }
//     );
//   }
// }


// import { NextResponse } from "next/server";
// import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

// export async function POST(req) {
//   try {
//     const { text, voice } = await req.json();

//     if (!text) {
//       return NextResponse.json({ error: "Missing text" }, { status: 400 });
//     }

//     const client = new ElevenLabsClient({
//       apiKey: process.env.ELEVENLABS_API_KEY,
//     });

//     const voiceId = voice || "JBFqnCBsd6RMkjVDRZzb"; // fallback

//     const audio = await client.textToSpeech.convert(
//       voiceId,
//       {
//         text,
//         modelId: "eleven_multilingual_v2",
//         outputFormat: "mp3_44100_128",
//       }
//     );

//     return new NextResponse(audio, {
//       headers: {
//         "Content-Type": "audio/mpeg",
//         "Content-Disposition": 'inline; filename="tts.mp3"',
//       },
//     });

//   } catch (error) {
//     console.error("ELEVENLABS TTS ERROR:", error);
//     return NextResponse.json({ error: error.message }, { status: 500 });
//   }
// }
