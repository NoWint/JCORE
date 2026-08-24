# Introduction

Pre-trained neural language models have been shown to learn a substantial amount of in-depth knowledge from data [@petroni-etal-2019-language]. They can do so without any access to an external memory, as a parameterized implicit knowledge base [@raffel2019t5; @roberts2020t5cqba]. While this development is exciting, such models do have downsides: They cannot easily expand or revise their memory, can't straightforwardly provide insight into their predictions, and may produce "hallucinations" [@marcus2020next]. Hybrid models that combine parametric memory with non-parametric (i.e., retrieval-based) memories [@guu2020realm; @Karpukhin20dense; @petroni2020how] can address some of these issues because knowledge can be directly revised and expanded, and accessed knowledge can be inspected and interpreted. REALM [@guu2020realm] and ORQA [@lee-etal-2019-latent], two recently introduced models that combine masked language models [@devlin_bert:_2019] with a differentiable retriever, have shown promising results, but have only explored open-domain extractive question answering. Here, we bring hybrid parametric and non-parametric memory to the "workhorse of NLP," i.e. sequence-to-sequence (seq2seq) models.

We endow pre-trained, parametric-memory generation models with a non-parametric memory through a general-purpose fine-tuning approach which we refer to as retrieval-augmented generation (RAG). We build RAG models where the parametric memory is a pre-trained seq2seq transformer, and the non-parametric memory is a dense vector index of Wikipedia, accessed with a pre-trained neural retriever. We combine these components in a probabilistic model trained end-to-end (Fig. [1](#fig:fig_1){reference-type="ref" reference="fig:fig_1"}). The retriever (Dense Passage Retriever [@Karpukhin20dense], henceforth DPR) provides latent documents conditioned on the input, and the seq2seq model (BART [@lewis2019bart]) then conditions on these latent documents together with the input to generate the output. We marginalize the latent documents with a top-K approximation, either on a per-output basis (assuming the same document is responsible for all tokens) or a per-token basis (where different documents are responsible for different tokens). Like T5 [@raffel2019t5] or BART, RAG can be fine-tuned on any seq2seq task, whereby both the generator and retriever are jointly learned.

There has been extensive previous work proposing architectures to enrich systems with non-parametric memory which are trained from scratch for specific tasks, e.g. memory networks [@weston2015memory; @sukhbaatar2015end], stack-augmented networks [@joulin2015] and memory layers [@lample_large_2019]. In contrast, we explore a setting where both parametric and non-parametric memory components are pre-trained and pre-loaded with extensive knowledge. Crucially, by using pre-trained access mechanisms, the ability to access knowledge is present without additional training.

Our results highlight the benefits of combining parametric and non-parametric memory with generation for *knowledge-intensive tasks*---tasks that humans could not reasonably be expected to perform without access to an external knowledge source. Our RAG models achieve state-of-the-art results on open Natural Questions [@kwiatkowski_natural_2019], WebQuestions [@berant_semantic_2013] and CuratedTrec [@baudivs2015modeling] and strongly outperform recent approaches that use specialised pre-training objectives on TriviaQA [@joshi_triviaqa:_2017]. Despite these being extractive tasks, we find that unconstrained generation outperforms previous extractive approaches. For knowledge-intensive generation, we experiment with MS-MARCO [@bajaj_ms_2016] and Jeopardy question generation, and we find that our models generate responses that are more factual, specific, and diverse than a BART baseline. For FEVER [@thorne-etal-2018-fever] fact verification, we achieve results within 4.3% of state-of-the-art pipeline models which use strong retrieval supervision. Finally, we demonstrate that the non-parametric memory can be replaced to update the models' knowledge as the world changes.[^1]

# Methods

We explore RAG models, which use the input sequence $x$ to retrieve text documents $z$ and use them as additional context when generating the target sequence $y$. As shown in Figure [1](#fig:fig_1){reference-type="ref" reference="fig:fig_1"}, our models leverage two components: (i) a retriever $p_\ensuremath{\eta}(\ensuremath{z}|\ensuremath{x})$ with parameters $\eta$ that returns (top-K truncated) distributions over text passages given a query $x$ and (ii) a generator $p_\ensuremath{\theta}(y_i|\ensuremath{x}, \ensuremath{z}, y_{1:i-1})$ parametrized by $\theta$ that generates a current token based on a context of the previous $i-1$ tokens $y_{1:i-1}$, the original input $x$ and a retrieved passage $z$.

To train the retriever and generator end-to-end, we treat the retrieved document as a latent variable. We propose two models that marginalize over the latent documents in different ways to produce a distribution over generated text. In one approach, *RAG-Sequence*, the model uses the same document to predict each target token. The second approach, *RAG-Token*, can predict each target token based on a different document. In the following, we formally introduce both models and then describe the $p_\ensuremath{\eta}$ and $p_\ensuremath{\theta}$ components, as well as the training and decoding procedure.

## Models

#### RAG-Sequence Model

The RAG-Sequence model uses the same retrieved document to generate the complete *sequence*. Technically, it treats the retrieved document as a single latent variable that is marginalized to get the seq2seq probability $p(\ensuremath{y}|\ensuremath{x})$ via a top-K approximation. Concretely, the top K documents are retrieved using the retriever, and the generator produces the output sequence probability for each document, which are then marginalized, $$p_{\text{\tiny{RAG-Sequence}}}(\ensuremath{y}|\ensuremath{x})\; \approx \; \sum_{\mathclap{\ensuremath{z}\in \text{top-}k(p(\cdot|\ensuremath{x}))}} p_\ensuremath{\eta}(\ensuremath{z}|\ensuremath{x}) p_\ensuremath{\theta}(\ensuremath{y}| \ensuremath{x}, \ensuremath{z})\; = \; \sum_{\mathclap{\ensuremath{z}\in \text{top-}k(p(\cdot|\ensuremath{x}))}} p_\ensuremath{\eta}(\ensuremath{z}|\ensuremath{x})\prod_i^N p_\ensuremath{\theta}(y_i|\ensuremath{x}, \ensuremath{z}, y_{1:i-1})$$

#### RAG-Token Model

In the RAG-Token model we can draw a different latent document for each target *token* and marginalize accordingly. This allows the generator to choose content from several documents when producing an answer. Concretely, the top K documents are retrieved using the retriever, and then the generator produces a distribution for the next output token for each document, before marginalizing, and repeating the process with the following output token, Formally, we define: $$p_{\text{\tiny{RAG-Token}}}(\ensuremath{y}|\ensuremath{x}) \; \approx \; \prod_{i}^N \; \sum_{\ensuremath{z}\in \text{top-}k(p(\cdot|\ensuremath{x}))} p_\ensuremath{\eta}(\ensuremath{z}|\ensuremath{x}) p_\ensuremath{\theta}(y_i|\ensuremath{x}, \ensuremath{z}, y_{1:i-1})$$

Finally, we note that RAG can be used for sequence classification tasks by considering the target class as a target sequence of length one, in which case RAG-Sequence and RAG-Token are equivalent.

## Retriever: DPR

The retrieval component $p_\ensuremath{\eta}(\ensuremath{z}|\ensuremath{x})$ is based on DPR [@Karpukhin20dense]. DPR follows a bi-encoder architecture: $$p_\ensuremath{\eta}(\ensuremath{z}|\ensuremath{x}) \propto \exp \left(\mathbf{d}(\ensuremath{z})^{\top} \mathbf{q}(\ensuremath{x})\right) \; \; \; \; \; \; \; \; \; \mathbf{d}(\ensuremath{z}) = \text{BERT}_{d}(z), \; \; \mathbf{q}(\ensuremath{x})=\text{BERT}_{q}(\ensuremath{x})$$ where $\mathbf{d}(\ensuremath{z})$ is a dense representation of a document produced by a BERT~BASE~ *document encoder* [@devlin_bert:_2019], and $\mathbf{q}(\ensuremath{x})$ a query representation produced by a *query encoder*, also based on BERT~BASE~. Calculating $\text{top-k}(p_\eta(\cdot|\ensuremath{x}))$, the list of $k$ documents $z$ with highest prior probability $p_\eta(\ensuremath{z}|\ensuremath{x})$, is a Maximum Inner Product Search (MIPS) problem, which can be approximately solved in sub-linear time [@JDH17]. We use a pre-trained bi-encoder from DPR to initialize our retriever and to build the document index. This retriever was trained to retrieve documents which contain answers to TriviaQA [@joshi_triviaqa:_2017] questions and Natural Questions [@kwiatkowski_natural_2019]. We refer to the document index as the *non-parametric memory*.

## Generator: BART

The generator component $p_\ensuremath{\theta}(y_i|\ensuremath{x}, \ensuremath{z}, y_{1:i-1})$ could be modelled using any encoder-decoder. We use BART-large [@lewis2019bart], a pre-trained seq2seq transformer [@vaswani2017attention] with 400M parameters. To combine the input $x$ with the retrieved content $z$ when generating from BART, we simply concatenate them. BART was pre-trained using a denoising objective and a variety of different noising functions. It has obtained state-of-the-art results on a diverse set of generation tasks and outperforms comparably-sized T5 models [@lewis2019bart]. We refer to the BART generator parameters $\theta$ as the *parametric memory* henceforth.

## Training

We jointly train the retriever and generator components without any direct supervision on what document should be retrieved. Given a fine-tuning training corpus of input/output pairs $(\ensuremath{x}_j,\ensuremath{y}_j)$, we minimize the negative marginal log-likelihood of each target, $\sum_j -\log p(\ensuremath{y}_j|\ensuremath{x}_j)$ using stochastic gradient descent with Adam [@kingma_adam]. Updating the document encoder $\text{BERT}_d$ during training is costly as it requires the document index to be periodically updated as REALM does during pre-training [@guu2020realm]. We do not find this step necessary for strong performance, and keep the document encoder (and index) fixed, only fine-tuning the query encoder $\text{BERT}_q$ and the BART generator.

## Decoding

At test time, RAG-Sequence and RAG-Token require different ways to approximate $\mathop{\mathrm{arg\,max}}_\ensuremath{y}p(\ensuremath{y}|\ensuremath{x})$.

#### RAG-Token

The RAG-Token model can be seen as a standard, autoregressive seq2seq generator with transition probability: $p'_\ensuremath{\theta}(y_i|\ensuremath{x}, y_{1:i-1}) = \sum_{\ensuremath{z}\in \text{top-}k(p(\cdot|\ensuremath{x}))} p_\ensuremath{\eta}(\ensuremath{z}_i|\ensuremath{x}) p_\ensuremath{\theta}(y_i|\ensuremath{x}, \ensuremath{z}_i, y_{1:i-1})$ To decode, we can plug $p'_\ensuremath{\theta}(y_i|\ensuremath{x}, y_{1:i-1})$ into a standard beam decoder.

#### RAG-Sequence

For RAG-Sequence, the likelihood $p(\ensuremath{y}|\ensuremath{x})$ does not break into a conventional per- token likelihood, hence we cannot solve it with a single beam search. Instead, we run beam search for each document $\ensuremath{z}$, scoring each hypothesis using $p_\ensuremath{\theta}(y_i|\ensuremath{x}, \ensuremath{z}, y_{1:i-1})$. This yields a set of hypotheses $Y$, some of which may not have appeared in the beams of all documents. To estimate the probability of an hypothesis $\ensuremath{y}$ we run an additional forward pass for each document $z$ for which $\ensuremath{y}$ does not appear in the beam, multiply generator probability with $p_\ensuremath{\eta}(\ensuremath{z}|\ensuremath{x})$ and then sum the probabilities across beams for the marginals. We refer to this decoding procedure as "Thorough Decoding." For longer output sequences, $|Y|$ can become large, requiring many forward passes. For more efficient decoding, we can make a further approximation that $p_\ensuremath{\theta}(y|\ensuremath{x}, \ensuremath{z}_i) \approx 0$ where $y$ was not generated during beam search from $\ensuremath{x}, \ensuremath{z}_i$. This avoids the need to run additional forward passes once the candidate set $Y$ has been generated. We refer to this decoding procedure as "Fast Decoding."

# Experiments

We experiment with RAG in a wide range of knowledge-intensive tasks. For all experiments, we use a single Wikipedia dump for our non-parametric knowledge source. Following @lee-etal-2019-latent and @Karpukhin20dense, we use the December 2018 dump. Each Wikipedia article is split into disjoint 100-word chunks, to make a total of 21M documents. We use the document encoder to compute an embedding for each document, and build a single MIPS index using FAISS [@JDH17] with a Hierarchical Navigable Small World approximation for fast retrieval [@Malkov2016EfficientAR]. During training, we retrieve the top $k$ documents for each query. We consider $k \in \{5,10\}$ for training and set $k$ for test time using dev data. We now discuss experimental details for each task.

## Open-domain Question Answering

Open-domain question answering (QA) is an important real-world application and common testbed for knowledge-intensive tasks [@guu2020realm]. We treat questions and answers as input-output text pairs $(x,y)$ and train RAG by directly minimizing the negative log-likelihood of answers. We compare RAG to the popular extractive QA paradigm [@chen_reading_2017; @clark_simple_2017; @lee-etal-2019-latent; @Karpukhin20dense], where answers are extracted spans from retrieved documents, relying primarily on non-parametric knowledge. We also compare to "Closed-Book QA" approaches [@roberts2020t5cqba], which, like RAG, generate answers, but which do not exploit retrieval, instead relying purely on parametric knowledge. We consider four popular open-domain QA datasets: Natural Questions (NQ) [@kwiatkowski_natural_2019], TriviaQA (TQA) [@joshi_triviaqa:_2017]. WebQuestions (WQ) [@berant_semantic_2013] and CuratedTrec (CT) [@baudivs2015modeling]. As CT and WQ are small, we follow DPR [@Karpukhin20dense] by initializing CT and WQ models with our NQ RAG model. We use the same train/dev/test splits as prior work [@lee-etal-2019-latent; @Karpukhin20dense] and report Exact Match (EM) scores. For TQA, to compare with T5 [@roberts2020t5cqba], we also evaluate on the TQA Wiki test set.

## Abstractive Question Answering

RAG models can go beyond simple extractive QA and answer questions with free-form, abstractive text generation. To test RAG's natural language generation (NLG) in a knowledge-intensive setting, we use the MSMARCO NLG task v2.1 [@DBLP:conf/nips/NguyenRSGTMD16]. The task consists of questions, ten gold passages retrieved from a search engine for each question, and a full sentence answer annotated from the retrieved passages. We do not use the supplied passages, only the questions and answers, to treat MSMARCO as an open-domain abstractive QA task. MSMARCO has some questions that cannot be answered in a way that matches the reference answer without access to the gold passages, such as "What is the weather in Volcano, CA?" so performance will be lower without using gold passages. We also note that some MSMARCO questions cannot be answered using Wikipedia alone. Here, RAG can rely on parametric knowledge to generate reasonable responses.

## Jeopardy Question Generation

To evaluate RAG's generation abilities in a non-QA setting, we study open-domain question generation. Rather than use questions from standard open-domain QA tasks, which typically consist of short, simple questions, we propose the more demanding task of generating Jeopardy questions. Jeopardy is an unusual format that consists of trying to guess an entity from a fact about that entity. For example, "The World Cup" is the answer to the question "In 1986 Mexico scored as the first country to host this international sports competition twice." As Jeopardy questions are precise, factual statements, generating Jeopardy questions conditioned on their answer entities constitutes a challenging knowledge-intensive generation task.

We use the splits from SearchQA [@dunn_searchqa:_2017], with 100K train, 14K dev, and 27K test examples. As this is a new task, we train a BART model for comparison. Following [@zhang-bansal-2019-addressing], we evaluate using the SQuAD-tuned Q-BLEU-1 metric [@nema-khapra-2018-towards]. Q-BLEU is a variant of BLEU with a higher weight for matching entities and has higher correlation with human judgment for question generation than standard metrics. We also perform two human evaluations, one to assess generation factuality, and one for specificity. We define factuality as whether a statement can be corroborated by trusted external sources, and specificity as high mutual dependence between the input and output [@li-etal-2016-diversity]. We follow best practice and use pairwise comparative evaluation [@Li2019ACUTEEVALID]. Evaluators are shown an answer and two generated questions, one from BART and one from RAG. They are then asked to pick one of four options---quuestion A is better, question B is better, both are good, or neither is good.

## Fact Verification

FEVER [@thorne-etal-2018-fever] requires classifying whether a natural language claim is supported or refuted by Wikipedia, or whether there is not enough information to decide. The task requires retrieving evidence from Wikipedia relating to the claim and then reasoning over this evidence to classify whether the claim is true, false, or unverifiable from Wikipedia alone. FEVER is a retrieval problem coupled with an challenging entailment reasoning task. It also provides an appropriate testbed for exploring the RAG models' ability to handle classification rather than generation. We map FEVER class labels (supports, refutes, or not enough info) to single output tokens and directly train with claim-class pairs. Crucially, unlike most other approaches to FEVER, we do not use supervision on retrieved evidence. In many real-world applications, retrieval supervision signals aren't available, and models that do not require such supervision will be applicable to a wider range of tasks. We explore two variants: the standard 3-way classification task (supports/refutes/not enough info) and the 2-way (supports/refutes) task studied in @Thorne2020AvoidingCF. In both cases we report label accuracy.

# Results

::: minipage
[]{#tab:qa_results_table label="tab:qa_results_table"}
:::

::: minipage
[]{#tab:generations label="tab:generations"}
:::

## Open-domain Question Answering

Table [\[tab:qa_results_table\]](#tab:qa_results_table){reference-type="ref" reference="tab:qa_results_table"} shows results for RAG along with state-of-the-art models. On all four open-domain QA tasks, RAG sets a new state of the art (only on the T5-comparable split for TQA). RAG combines the generation flexibility of the "closed-book" (parametric only) approaches and the performance of \"open-book\" retrieval-based approaches. Unlike REALM and T5+SSM, RAG enjoys strong results without expensive, specialized "salient span masking" pre-training [@guu2020realm]. It is worth noting that RAG's retriever is initialized using DPR's retriever, which uses retrieval supervision on Natural Questions and TriviaQA. RAG compares favourably to the DPR QA system, which uses a BERT-based "cross-encoder" to re-rank documents, along with an extractive reader. RAG demonstrates that neither a re-ranker nor extractive reader is necessary for state-of-the-art performance.

There are several advantages to generating answers even when it is possible to extract them. Documents with clues about the answer but do not contain the answer verbatim can still contribute towards a correct answer being generated, which is not possible with standard extractive approaches, leading to more effective marginalization over documents. Furthermore, RAG can generate correct answers even when the correct answer is not in any retrieved document, achieving 11.8% accuracy in such cases for NQ, where an extractive model would score 0%.

## Abstractive Question Answering

As shown in Table [\[tab:generations\]](#tab:generations){reference-type="ref" reference="tab:generations"}, RAG-Sequence outperforms BART on Open MS-MARCO NLG by 2.6 Bleu points and 2.6 Rouge-L points. RAG approaches state-of-the-art model performance, which is impressive given that (i) those models access gold passages with specific information required to generate the reference answer , (ii) many questions are unanswerable without the gold passages, and (iii) not all questions are answerable from Wikipedia alone. Table [\[tab:examples\]](#tab:examples){reference-type="ref" reference="tab:examples"} shows some generated answers from our models. Qualitatively, we find that RAG models hallucinate less and generate factually correct text more often than BART. Later, we also show that RAG generations are more diverse than BART generations (see §[4.5](#sec:gen_div){reference-type="ref" reference="sec:gen_div"}).

## Jeopardy Question Generation {#sec:fact_generation_results}

Table [\[tab:generations\]](#tab:generations){reference-type="ref" reference="tab:generations"} shows that RAG-Token performs better than RAG-Sequence on Jeopardy question generation, with both models outperforming BART on Q-BLEU-1. [\[tab:jeopardy\]](#tab:jeopardy){reference-type="ref" reference="tab:jeopardy"} shows human evaluation results, over 452 pairs of generations from BART and RAG-Token. Evaluators indicated that BART was more factual than RAG in only 7.1% of cases, while RAG was more factual in 42.7% of cases, and both RAG and BART were factual in a further 17% of cases, clearly demonstrating the effectiveness of RAG on the task over a state-of-the-art generation model. Evaluators also find RAG generations to be more specific by a large margin. Table [\[tab:examples\]](#tab:examples){reference-type="ref" reference="tab:examples"} shows typical generations from each model.

Jeopardy questions often contain two separate pieces of information, and RAG-Token may perform best because it can generate responses that combine content from several documents. Figure [2](#fig:posterior_plot){reference-type="ref" reference="fig:posterior_plot"} shows an example. When generating "Sun", the posterior is high for document 2 which mentions "The Sun Also Rises". Similarly, document 1 dominates the posterior when "A Farewell to Arms" is generated. Intriguingly, after the first token of each book is generated, the document posterior flattens. This observation suggests that the generator can complete the titles without depending on specific documents. In other words, the model's parametric knowledge is sufficient to complete the titles. We find evidence for this hypothesis by feeding the BART-only baseline with the partial decoding [`"The Sun`]{.mark}. BART completes the generation [`"The Sun Also Rises" is a novel by this author of "The Sun Also Rises"`]{.mark} indicating the title \"The Sun Also Rises\" is stored in BART's parameters. Similarly, BART will complete the partial decoding [`"The Sun Also Rises" is a novel by this author of "A`]{.mark} with [`"The Sun Also Rises" is a novel by this author of "A Farewell to Arms"`]{.mark}. This example shows how parametric and non-parametric memories *work together*---the non-parametric component helps to guide the generation, drawing out specific knowledge stored in the parametric memory.

> Figure: RAG-Token document posterior $p(\ensuremath{z}_i|\ensuremath{x}, y_i, y_{-i})$ for each generated token for input "Hemingway\" for Jeopardy generation with 5 retrieved documents. The posterior for document 1 is high when generating "A Farewell to Arms\" and for document 2 when generating "The Sun Also Rises\".

[]{#tab:examples label="tab:examples"}

::: minipage
                 Factuality   Specificity
  ------------- ------------ -------------
  BART better       7.1%         16.8%
  RAG better     **42.7%**     **37.4%**
  Both good        11.7%         11.8%
  Both poor        17.7%         6.9%
  No majority      20.8%         20.1%

  : Ratio of distinct to total tri-grams for generation tasks. {#tab:diversity}

[]{#tab:jeopardy label="tab:jeopardy"}
:::

::: minipage
               MSMARCO   Jeopardy QGen
  ----------- --------- ---------------
  Gold          89.6%        90.0%
  BART          70.7%        32.4%
  RAG-Token     77.8%        46.8%
  RAG-Seq.      83.5%        53.8%

  : Ratio of distinct to total tri-grams for generation tasks. {#tab:diversity}

[]{#tab:diversity label="tab:diversity"}
:::

## Fact Verification

Table [\[tab:generations\]](#tab:generations){reference-type="ref" reference="tab:generations"} shows our results on FEVER. For 3-way classification, RAG scores are within 4.3% of state-of-the-art models, which are complex pipeline systems with domain-specific architectures and substantial engineering, trained using intermediate retrieval supervision, which RAG does not require. For 2-way classification, we compare against @Thorne2020AvoidingCF, who train RoBERTa [@liu-etal-2019-robust] to classify the claim as true or false given the gold evidence sentence. RAG achieves an accuracy within 2.7% of this model, despite being supplied with only the claim and retrieving its own evidence. We also analyze whether documents retrieved by RAG correspond to documents annotated as gold evidence in FEVER. We calculate the overlap in article titles between the top $k$ documents retrieved by RAG and gold evidence annotations. We find that the top retrieved document is from a gold article in 71% of cases, and a gold article is present in the top 10 retrieved articles in 90% of cases.

## Additional Results {#sec:gen_div}

#### Generation Diversity

Section [4.3](#sec:fact_generation_results){reference-type="ref" reference="sec:fact_generation_results"} shows that RAG models are more factual and specific than BART for Jeopardy question generation. Following recent work on diversity-promoting decoding [@li-etal-2016-diversity; @Vijayakumar2016DiverseBS; @massarelli2019decoding], we also investigate generation diversity by calculating the ratio of distinct ngrams to total ngrams generated by different models. Table [2](#tab:diversity){reference-type="ref" reference="tab:diversity"} shows that RAG-Sequence's generations are more diverse than RAG-Token's, and both are significantly more diverse than BART without needing any diversity-promoting decoding.

+:--------------------+:---------+:---------+:---------+:---------+:---------+:---------+:---------+:---------+:-------:+:-------:+
| Model               | NQ       | TQA      | WQ       | CT       | Jeopardy-QGen       | MSMarco             | FVR-3   | FVR-2   |
+---------------------+----------+----------+----------+----------+----------+----------+----------+----------+---------+---------+
|                     | Exact Match                               | B-1      | QB-1     | R-L      | B-1      | Label Accuracy    |
+---------------------+----------+----------+----------+----------+----------+----------+----------+----------+---------+---------+
| RAG-Token-BM25      | 29.7     | 41.5     | 32.1     | 33.1     | 17.5     | 22.3     | 55.5     | 48.4     |         |         |
+---------------------+----------+----------+----------+----------+----------+----------+----------+----------+---------+---------+
| RAG-Sequence-BM25   | 31.8     | 44.1     | 36.6     | 33.8     | 11.1     | 19.5     | 56.5     | 46.9     |         |         |
+---------------------+----------+----------+----------+----------+----------+----------+----------+----------+---------+---------+
| RAG-Token-Frozen    | 37.8     | 50.1     | 37.1     | 51.1     | 16.7     | 21.7     | 55.9     | 49.4     | 72.9    | 89.4    |
+---------------------+----------+----------+----------+----------+----------+----------+----------+----------+         |         |
| RAG-Sequence-Frozen | 41.2     | 52.1     | 41.8     | 52.6     | 11.8     | 19.6     | 56.7     | 47.3     |         |         |
+---------------------+----------+----------+----------+----------+----------+----------+----------+----------+---------+---------+
| RAG-Token           | 43.5     | 54.8     | **46.5** | 51.9     | **17.9** | **22.6** | 56.2     | **49.4** | 74.5    | 90.6    |
+---------------------+----------+----------+----------+----------+----------+----------+----------+----------+         |         |
| RAG-Sequence        | **44.0** | **55.8** | 44.9     | **53.4** | 15.3     | 21.5     | **57.2** | 47.5     |         |         |
+---------------------+----------+----------+----------+----------+----------+----------+----------+----------+---------+---------+

: Ablations on the dev set. As FEVER is a classification task, both RAG models are equivalent. {#tab:ablations}

[]{#tab:ablations label="tab:ablations"}

#### Retrieval Ablations

A key feature of RAG is learning to retrieve relevant information for the task. To assess the effectiveness of the retrieval mechanism, we run ablations where we freeze the retriever during training. As shown in Table [3](#tab:ablations){reference-type="ref" reference="tab:ablations"}, learned retrieval improves results for all tasks.

We compare RAG's dense retriever to a word overlap-based BM25 retriever [@robertson2009bm25]. Here, we replace RAG's retriever with a fixed BM25 system, and use BM25 retrieval scores as logits when calculating $p(\ensuremath{z}|\ensuremath{x})$. Table [3](#tab:ablations){reference-type="ref" reference="tab:ablations"} shows the results. For FEVER, BM25 performs best, perhaps since FEVER claims are heavily entity-centric and thus well-suited for word overlap-based retrieval. Differentiable retrieval improves results on all other tasks, especially for Open-Domain QA, where it is crucial.

#### Index hot-swapping

An advantage of non-parametric memory models like RAG is that knowledge can be easily updated at test time. Parametric-only models like T5 or BART need further training to update their behavior as the world changes. To demonstrate, we build an index using the DrQA [@chen_reading_2017] Wikipedia dump from December 2016 and compare outputs from RAG using this index to the newer index from our main results (December 2018). We prepare a list of 82 world leaders who had changed between these dates and use a template "Who is {position}?" (e.g. "Who is the President of Peru?") to query our NQ RAG model with each index. RAG answers 70% correctly using the 2016 index for 2016 world leaders and 68% using the 2018 index for 2018 world leaders. Accuracy with mismatched indices is low (12% with the 2018 index and 2016 leaders, 4% with the 2016 index and 2018 leaders). This shows we can update RAG's world knowledge by simply replacing its non-parametric memory.

#### Effect of Retrieving more documents

Models are trained with either 5 or 10 retrieved latent documents, and we do not observe significant differences in performance between them. We have the flexibility to adjust the number of retrieved documents at test time, which can affect performance and runtime. Figure [3](#fig:n_docs_figures){reference-type="ref" reference="fig:n_docs_figures"} (left) shows that retrieving more documents at test time monotonically improves Open-domain QA results for RAG-Sequence, but performance peaks for RAG-Token at 10 retrieved documents. Figure [3](#fig:n_docs_figures){reference-type="ref" reference="fig:n_docs_figures"} (right) shows that retrieving more documents leads to higher Rouge-L for RAG-Token at the expense of Bleu-1, but the effect is less pronounced for RAG-Sequence.

# Related Work

#### Single-Task Retrieval

Prior work has shown that retrieval improves performance across a variety of NLP tasks when considered in isolation. Such tasks include open-domain question answering [@chen_reading_2017; @kwiatkowski_natural_2019], fact checking [@thorne-etal-2018-fever], fact completion [@petroni2020how], long-form question answering [@fan-etal-2019-eli5], Wikipedia article generation [@liu2018generating], dialogue [@moghe-etal-2018-towards; @weston-etal-2018-retrieve; @dinan2018wizard; @fan2020augmenting], translation [@gu2018search], and language modeling [@guu-etal-2018-generating; @khandelwal2020generalization]. Our work unifies previous successes in incorporating retrieval into individual tasks, showing that a single retrieval-based architecture is capable of achieving strong performance across several tasks.

#### General-Purpose Architectures for NLP

Prior work on general-purpose architectures for NLP tasks has shown great success without the use of retrieval. A single, pre-trained language model has been shown to achieve strong performance on various classification tasks in the GLUE benchmarks [@wang-etal-2018-glue; @wang_superglue_2019] after fine-tuning [@radford_improving_2018; @devlin_bert:_2019]. GPT-2 [@radford2019language] later showed that a single, left-to-right, pre-trained language model could achieve strong performance across both discriminative and generative tasks. For further improvement, BART [@lewis2019bart] and T5 [@raffel2019t5; @roberts2020t5cqba] propose a single, pre-trained encoder-decoder model that leverages bi-directional attention to achieve stronger performance on discriminative and generative tasks. Our work aims to expand the space of possible tasks with a single, unified architecture, by learning a retrieval module to augment pre-trained, generative language models.

#### Learned Retrieval

There is significant work on learning to retrieve documents in information retrieval, more recently with pre-trained, neural language models [@nogueira2019passage; @Karpukhin20dense] similar to ours. Some work optimizes the retrieval module to aid in a specific, downstream task such as question answering, using search [@perez-etal-2019-finding], reinforcement learning [@choi-etal-2017-coarse; @wang2018evidence-aggregation; @wang2018r3], or a latent variable approach [@lee-etal-2019-latent; @guu2020realm] as in our work. These successes leverage different retrieval-based architectures and optimization techniques to achieve strong performance on a single task, while we show that a single retrieval-based architecture can be fine-tuned for strong performance on a variety of tasks.

#### Memory-based Architectures

Our document index can be seen as a large external memory for neural networks to attend to, analogous to memory networks [@weston2015memory; @sukhbaatar2015end]. Concurrent work [@fevry2020entities] learns to retrieve a trained embedding for each entity in the input, rather than to retrieve raw text as in our work. Other work improves the ability of dialog models to generate factual text by attending over fact embeddings [@ghazvininejad2018knowledge; @fan2020augmenting]. A key feature of our memory is that it is comprised of raw text rather distributed representations, which makes the memory both (i) human-readable, lending a form of interpretability to our model, and (ii) human-writable, enabling us to dynamically update the model's memory by editing the document index. This approach has also been used in knowledge-intensive dialog, where generators have been conditioned on retrieved text directly, albeit obtained via TF-IDF rather than end-to-end learnt retrieval [@dinan2018wizard].

#### Retrieve-and-Edit approaches

Our method shares some similarities with retrieve-and-edit style approaches, where a similar training input-output pair is retrieved for a given input, and then edited to provide a final output. These approaches have proved successful in a number of domains including Machine Translation  [@gu_mt_retrieve_and_edit; @hossain-etal-2020-simple] and Semantic Parsing [@NIPS2018_8209]. Our approach does have several differences, including less of emphasis on lightly editing a retrieved item, but on aggregating content from several pieces of retrieved content, as well as learning latent retrieval, and retrieving evidence documents rather than related training pairs. This said, RAG techniques may work well in these settings, and could represent promising future work.

# Discussion

In this work, we presented hybrid generation models with access to parametric and non-parametric memory. We showed that our RAG models obtain state of the art results on open-domain QA. We found that people prefer RAG's generation over purely parametric BART, finding RAG more factual and specific. We conducted an thorough investigation of the learned retrieval component, validating its effectiveness, and we illustrated how the retrieval index can be hot-swapped to update the model without requiring any retraining. In future work, it may be fruitful to investigate if the two components can be jointly pre-trained from scratch, either with a denoising objective similar to BART or some another objective. Our work opens up new research directions on how parametric and non-parametric memories interact and how to most effectively combine them, showing promise in being applied to a wide variety of NLP tasks.

# Broader Impact {#broader-impact .unnumbered}

This work offers several positive societal benefits over previous work: the fact that it is more strongly grounded in real factual knowledge (in this case Wikipedia) makes it "hallucinate" less with generations that are more factual, and offers more control and interpretability. RAG could be employed in a wide variety of scenarios with direct benefit to society, for example by endowing it with a medical index and asking it open-domain questions on that topic, or by helping people be more effective at their jobs.

With these advantages also come potential downsides: Wikipedia, or any potential external knowledge source, will probably never be entirely factual and completely devoid of bias. Since RAG can be employed as a language model, similar concerns as for GPT-2 [@radford2019language] are valid here, although arguably to a lesser extent, including that it might be used to generate abuse, faked or misleading content in the news or on social media; to impersonate others; or to automate the production of spam/phishing content [@solaiman2019release]. Advanced language models may also lead to the automation of various jobs in the coming decades [@grace2017when]. In order to mitigate these risks, AI systems could be employed to fight against misleading content and automated spam/phishing.

# Acknowledgments {#acknowledgments .unnumbered}

The authors would like to thank the reviewers for their thoughtful and constructive feedback on this paper, as well as HuggingFace for their help in open-sourcing code to run RAG models. The authors would also like to thank Kyunghyun Cho and Sewon Min for productive discussions and advice. EP thanks supports from the NSF Graduate Research Fellowship. PL is supported by the FAIR PhD program.

::: center
*Appendices for* Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks\
:::

# Implementation Details

For Open-domain QA we report test numbers using 15 retrieved documents for RAG-Token models. For RAG-Sequence models, we report test results using 50 retrieved documents, and we use the Thorough Decoding approach since answers are generally short. We use greedy decoding for QA as we did not find beam search improved results. For Open-MSMarco and Jeopardy question generation, we report test numbers using ten retrieved documents for both RAG-Token and RAG-Sequence, and we also train a BART-large model as a baseline. We use a beam size of four, and use the Fast Decoding approach for RAG-Sequence models, as Thorough Decoding did not improve performance.

# Human Evaluation

Figure [4](#fig:annot){reference-type="ref" reference="fig:annot"} shows the user interface for human evaluation. To avoid any biases for screen position, which model corresponded to sentence A and sentence B was randomly selected for each example. Annotators were encouraged to research the topic using the internet, and were given detailed instructions and worked examples in a full instructions tab. We included some gold sentences in order to assess the accuracy of the annotators. Two annotators did not perform well on these examples and their annotations were removed from the results.

# Training setup Details

We train all RAG models and BART baselines using Fairseq [@ott-etal-2019-fairseq].[^2] We train with mixed precision floating point arithmetic [@micikevicius2018mixed], distributing training across 8, 32GB NVIDIA V100 GPUs, though training and inference can be run on one GPU. We find that doing Maximum Inner Product Search with FAISS is sufficiently fast on CPU, so we store document index vectors on CPU, requiring $\sim100$ GB of CPU memory for all of Wikipedia. After submission, We have ported our code to HuggingFace Transformers [@Wolf2019HuggingFacesTS][^3], which achieves equivalent performance to the previous version but is a cleaner and easier to use implementation. This version is also open-sourced. We also compress the document index using FAISS's compression tools, reducing the CPU memory requirement to 36GB. Scripts to run experiments with RAG can be found at <https://github.com/huggingface/transformers/blob/master/examples/rag/README.md> and an interactive demo of a RAG model can be found at <https://huggingface.co/rag/>

# Further Details on Open-Domain QA {#sec:qa_appendix}

For open-domain QA, multiple answer annotations are often available for a given question. These answer annotations are exploited by extractive models during training as typically all the answer annotations are used to find matches within documents when preparing training data. For RAG, we also make use of multiple annotation examples for Natural Questions and WebQuestions by training the model with each $(q,a)$ pair separately, leading to a small increase in accuracy. For TriviaQA, there are often many valid answers to a given question, some of which are not suitable training targets, such as emoji or spelling variants. For TriviaQA, we filter out answer candidates if they do not occur in top 1000 documents for the query.

#### CuratedTrec preprocessing

The answers for CuratedTrec are given in the form of regular expressions, which has been suggested as a reason why it is unsuitable for answer-generation models [@guu2020realm]. To overcome this, we use a pre-processing step where we first retrieve the top 1000 documents for each query, and use the answer that most frequently matches the regex pattern as the supervision target. If no matches are found, we resort to a simple heuristic: generate all possible permutations for each regex, replacing non-deterministic symbols in the regex nested tree structure with a whitespace.

#### TriviaQA Evaluation setups

The open-domain QA community customarily uses public development datasets as test datasets, as test data for QA datasets is often restricted and dedicated to reading compehension purposes. We report our results using the datasets splits used in DPR [@Karpukhin20dense], which are consistent with common practice in Open-domain QA. For TriviaQA, this test dataset is the public TriviaQA Web Development split. @roberts2020t5cqba used the TriviaQA official Wikipedia test set instead. @fevry2020entities follow this convention in order to compare with @roberts2020t5cqba (See appendix of [@fevry2020entities]). We report results on both test sets to enable fair comparison to both approaches. We find that our performance is much higher using the official Wiki test set, rather than the more conventional open-domain test set, which we attribute to the official Wiki test set questions being simpler to answer from Wikipedia.

# Further Details on FEVER

For FEVER classification, we follow the practice from [@lewis2019bart], and first re-generate the claim, and then classify using the representation of the final hidden state, before finally marginalizing across documents to obtain the class probabilities. The FEVER task traditionally has two sub-tasks. The first is to classify the claim as either \"Supported\", \"Refuted\" or \"Not Enough Info\", which is the task we explore in the main paper. FEVER's other sub-task involves extracting sentences from Wikipedia as evidence supporting the classification prediction. As FEVER uses a different Wikipedia dump to us, directly tackling this task is not straightforward. We hope to address this in future work.

# Null Document Probabilities

We experimented with adding \"Null document\" mechanism to RAG, similar to REALM [@guu2020realm] in order to model cases where no useful information could be retrieved for a given input. Here, if $k$ documents were retrieved, we would additionally \"retrieve\" an empty document and predict a logit for the null document, before marginalizing over $k+1$ predictions. We explored modelling this null document logit by learning (i) a document embedding for the null document, (ii) a static learnt bias term, or (iii) a neural network to predict the logit. We did not find that these improved performance, so in the interests of simplicity, we omit them. For Open MS-MARCO, where useful retrieved documents cannot always be retrieved, we observe that the model learns to always retrieve a particular set of documents for questions that are less likely to benefit from retrieval, suggesting that null document mechanisms may not be necessary for RAG.

# Parameters

Our RAG models contain the trainable parameters for the BERT-base query and document encoder of DPR, with 110M parameters each (although we do not train the document encoder ourselves) and 406M trainable parameters from BART-large, 406M parameters, making a total of 626M trainable parameters. The best performing \"closed-book\" (parametric only) open-domain QA model is T5-11B with 11 Billion trainable parameters. The T5 model with the closest number of parameters to our models is T5-large (770M parameters), which achieves a score of 28.9 EM on Natural Questions [@roberts2020t5cqba], substantially below the 44.5 that RAG-Sequence achieves, indicating that hybrid parametric/non-parametric models require far fewer trainable parameters for strong open-domain QA performance. The non-parametric memory index does not consist of trainable parameters, but does consists of 21M 728 dimensional vectors, consisting of 15.3B values. These can be easily be stored at 8-bit floating point precision to manage memory and disk footprints.

# Retrieval Collapse

In preliminary experiments, we observed that for some tasks such as story generation [@fan-etal-2018-hierarchical], the retrieval component would "collapse" and learn to retrieve the same documents regardless of the input. In these cases, once retrieval had collapsed, the generator would learn to ignore the documents, and the RAG model would perform equivalently to BART. The collapse could be due to a less-explicit requirement for factual knowledge in some tasks, or the longer target sequences, which could result in less informative gradients for the retriever. @perez-etal-2019-finding also found spurious retrieval results when optimizing a retrieval component in order to improve performance on downstream tasks.

# Number of instances per dataset

The number of training, development and test datapoints in each of our datasets is shown in Table [4](#tab:num_instances){reference-type="ref" reference="tab:num_instances"}.

  Task                              Train   Development       Test
  ------------------------------ -------- ------------- ----------
  Natural Questions                 79169          8758       3611
  TriviaQA                          78786          8838      11314
  WebQuestions                       3418           362       2033
  CuratedTrec                         635           134        635
  Jeopardy Question Generation      97392         13714      26849
  MS-MARCO                         153726         12468   101093\*
  FEVER-3-way                      145450         10000      10000
  FEVER-2-way                       96966          6666       6666

  : Number of instances in the datasets used. \*A hidden subset of this data is used for evaluation {#tab:num_instances}

[]{#tab:num_instances label="tab:num_instances"}

[^1]: Code to run experiments with RAG has been open-sourced as part of the HuggingFace Transformers Library [@Wolf2019HuggingFacesTS] and can be found at <https://github.com/huggingface/transformers/blob/master/examples/rag/>. An interactive demo of RAG models can be found at <https://huggingface.co/rag/>

[^2]: <https://github.com/pytorch/fairseq>

[^3]: <https://github.com/huggingface/transformers>
