# Reasoning while Decoding: Search Against Verifier

![Project Status](https://img.shields.io/badge/Status-Active-success)
![Course](https://img.shields.io/badge/Course-CSE495B-blue)
![Language](https://img.shields.io/badge/Language-Python-yellow)
![Platform](https://img.shields.io/badge/Platform-VS_Code_%7C_Colab-orange)

## 🎓 Course Information
**Course:** CSE495B: Natural Language Processing  
**Instructor:** Dr. Mohammad Ashrafuzzaman Khan [AzK]  
**Department:** Computer Science and Engineering  
**Authors:** MD. Ibrahim Siddik, Fuad Al Mamun
---

## 📝 Project Overview
This project focuses on implementing a **"Search against Verifier"** strategy for Large Language Models (LLMs). The core concept is not to re-train the model, but to **structure the inference process** to improve reasoning capabilities.

By implementing a "Reasoning while Decoding" pipeline, we utilize Chain-of-Thought (CoT) prompting combined with self-consistency (majority voting) to ensure more accurate model outputs.

### Key Objectives
* Implement Chain-of-Thought (CoT) forcing.
* Create a sampling loop for diversity.
* Implement a parser to separate reasoning from answers.
* Develop a majority voting verifier.

---

## ⚙️ Methodology & Architecture

As outlined in the project planning, the pipeline consists of four distinct steps:

### 1. Force Thinking (Chain-of-Thought)
We modify the system prompt to force the model to explicitize its reasoning process.
* **Technique:** Prompt Engineering.
* **Mechanism:** The model is instructed to output a `<think>` block for reasoning before providing the final result in an `<answer>` block.

### 2. Sampling Loop
Instead of a single generation, we implement a sampling loop to explore different reasoning paths.
* **Algorithm:** Existing algorithm combination sampling.
* **Process:** Run the inference on a loop (generating 5 to 10 different responses) using non-zero temperature to ensure diversity in the logic.

### 3. Parsing
Raw model outputs contain both the "thinking" process and the final result.
* **Action:** Programmatically discard the content within the `<think>` tags.
* **Output:** A clean list of potential answers/data derived from the various reasoning paths.

### 4. Verifier (Majority Voting)
To select the most probable correct answer from the sampled list.
* **Method:** Majority Voting.
* **Logic:** The system analyzes the clean list of data and selects the answer that appears most frequently as the final output.

---

## 🛠️ Tech Stack & Requirements

* **IDE:** Visual Studio Code (Recommended)
* **Alternative Environment:** Google Colab
* **Language:** Python 3.8+
* **Extensions:** * Python (Microsoft)
    * Jupyter (Microsoft)
    * *Optional:* Pylance

