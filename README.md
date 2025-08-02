# TwinMind Interview Assignment - Creating the iOS app on the Web 

A full-stack web recreation of the **TwinMind iOS app**, built as a take-home interview assignment using modern technologies. TwinMind allows users to record voice notes, transcribe them with AI, generate intelligent summaries, and interact with their memories through a conversational interface.

Try it out!
🔗 [Live Demo](https://twinmind.vercel.app)

## ✨ Features

- 🎙️ **Voice Journaling**  
  Record audio through your microphone (or calls) and transcribe it using **Gemini Pro**.

- 🧾 **AI Summarization**  
  Automatically generate high-quality summaries using **OpenAI GPT-4**.

- 🗂️ **Memory Timeline**  
  Browse and manage past recordings, transcripts, and AI summaries.

- 💬 **Memory Chat**  
  Chat with individual memory entries using a **RAG (Retrieval-Augmented Generation)** model.

- 🧠 **Global Memory Chat**  
  Query across all memories using a global RAG system powered by vector embeddings.

- 🔐 **Authentication**  
  Secure sign-in experience using **NextAuth.js**.

## 🛠️ Tech Stack

| Layer           | Technology                    |
|------------------|-------------------------------|
| Frontend         | Next.js (App Router), React, Tailwind CSS |
| Backend / API    | Next.js API Routes             |
| Authentication   | NextAuth.js                   |
| Database         | Supabase PostgreSQL           |
| Transcription    | Gemini Pro                    |
| AI Summarization | OpenAI GPT                    |
| Embeddings       | OpenAI Ada                    |
| Vector Search    | RAG pipeline over Supabase    |

