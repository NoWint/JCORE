# Introduction

Language model pre-training has been shown to be effective for improving many natural language processing tasks [@dai-le:2015:_semi; @peters-etal:2018:_deep; @radford-etal:2018; @howard-ruder:2018]. These include sentence-level tasks such as natural language inference [@bowman-etal:2015; @williams-nangia-bowman:2018] and paraphrasing [@dolan-brockett:2005:_autom], which aim to predict the relationships between sentences by analyzing them holistically, as well as token-level tasks such as named entity recognition and question answering, where models are required to produce fine-grained output at the token level [@tjong-de:2003; @rajpurkar-etal:2016:_squad].

There are two existing strategies for applying pre-trained language representations to downstream tasks: *feature-based* and *fine-tuning*. The feature-based approach, such as ELMo [@peters-etal:2018:_deep], uses task-specific architectures that include the pre-trained representations as additional features. The fine-tuning approach, such as the Generative Pre-trained Transformer (OpenAI GPT) [@radford-etal:2018], introduces minimal task-specific parameters, and is trained on the downstream tasks by simply fine-tuning *all* pre-trained parameters. The two approaches share the same objective function during pre-training, where they use unidirectional language models to learn general language representations.

We argue that current techniques restrict the power of the pre-trained representations, especially for the fine-tuning approaches. The major limitation is that standard language models are unidirectional, and this limits the choice of architectures that can be used during pre-training. For example, in OpenAI GPT, the authors use a left-to-right architecture, where every token can only attend to previous tokens in the self-attention layers of the Transformer [@vaswani-etal:2017:_atten]. Such restrictions are sub-optimal for sentence-level tasks, and could be very harmful when applying fine-tuning based approaches to token-level tasks such as question answering, where it is crucial to incorporate context from both directions.

In this paper, we improve the fine-tuning based approaches by proposing BERT: **B**idirectional **E**ncoder **R**epresentations from **T**ransformers. BERT alleviates the previously mentioned unidirectionality constraint by using a "masked language model" (MLM) pre-training objective, inspired by the Cloze task [@taylor:1953:_cloze]. The masked language model randomly masks some of the tokens from the input, and the objective is to predict the original vocabulary id of the masked word based only on its context. Unlike left-to-right language model pre-training, the MLM objective enables the representation to fuse the left and the right context, which allows us to pre-train a deep bidirectional Transformer. In addition to the masked language model, we also use a "next sentence prediction" task that jointly pre-trains text-pair representations. The contributions of our paper are as follows:

- We demonstrate the importance of bidirectional pre-training for language representations. Unlike @radford-etal:2018, which uses unidirectional language models for pre-training, BERT uses masked language models to enable pre-trained deep bidirectional representations. This is also in contrast to @peters-etal:2018:_deep, which uses a shallow concatenation of independently trained left-to-right and right-to-left LMs.

- We show that pre-trained representations reduce the need for many heavily-engineered task-specific architectures. BERT is the first fine-tuning based representation model that achieves state-of-the-art performance on a large suite of sentence-level *and* token-level tasks, outperforming many task-specific architectures.

- BERT advances the state of the art for eleven NLP tasks. The code and pre-trained models are available at <https://github.com/google-research/bert>.

# Related Work

There is a long history of pre-training general language representations, and we briefly review the most widely-used approaches in this section.

## Unsupervised Feature-based Approaches

Learning widely applicable representations of words has been an active area of research for decades, including non-neural [@brown-etal:1992:_class; @ando-zhang:2005; @blitzer-mcdonald-pereira:2006:_domain] and neural [@mikolov-etal:2013; @pennington-socher-manning:2014:_glove] methods. Pre-trained word embeddings are an integral part of modern NLP systems, offering significant improvements over embeddings learned from scratch [@turian-ratinov-bengio:2010:_word_repres]. To pre-train word embedding vectors, left-to-right language modeling objectives have been used [@minh09], as well as objectives to discriminate correct from incorrect words in left and right context [@mikolov-etal:2013].

These approaches have been generalized to coarser granularities, such as sentence embeddings [@kiros-etal:2015:_skip; @logeswaran2018an] or paragraph embeddings [@le-mikolov:2014:_distr]. To train sentence representations, prior work has used objectives to rank candidate next sentences [@DBLP:journals/corr/JerniteBS17; @logeswaran2018an], left-to-right generation of next sentence words given a representation of the previous sentence [@kiros-etal:2015:_skip], or denoising auto-encoder derived objectives [@hill16].

<figure id="fig:bert_overall" data-latex-placement="t!">
<div class="center">
<embed src="/figures/bert-pretraining-deep-bidirectional-transformers/BERT_Overall.pdf" style="width:100.0%" />
</div>
<figcaption>Overall pre-training and fine-tuning procedures for BERT. Apart from output layers, the same architectures are used in both pre-training and fine-tuning. The same pre-trained model parameters are used to initialize models for different down-stream tasks. During fine-tuning, all parameters are fine-tuned. <span><code>[CLS]</code></span> is a special symbol added in front of every input example, and <span><code>[SEP]</code></span> is a special separator token (e.g. separating questions/answers).</figcaption>
</figure>

ELMo and its predecessor [@peters-etal:2017:_semi; @peters-etal:2018:_deep] generalize traditional word embedding research along a different dimension. They extract *context-sensitive* features from a left-to-right and a right-to-left language model. The contextual representation of each token is the concatenation of the left-to-right and right-to-left representations. When integrating contextual word embeddings with existing task-specific architectures, ELMo advances the state of the art for several major NLP benchmarks [@peters-etal:2018:_deep] including question answering [@rajpurkar-etal:2016:_squad], sentiment analysis [@socher-etal:2013:_recur], and named entity recognition [@tjong-de:2003]. @melamud2016context2vec proposed learning contextual representations through a task to predict a single word from both left and right context using LSTMs. Similar to ELMo, their model is feature-based and not deeply bidirectional. @fedus2018maskgan shows that the cloze task can be used to improve the robustness of text generation models.

## Unsupervised Fine-tuning Approaches

As with the feature-based approaches, the first works in this direction only pre-trained word embedding parameters from unlabeled text  [@collobert-weston:2008].

More recently, sentence or document encoders which produce contextual token representations have been pre-trained from unlabeled text and fine-tuned for a supervised downstream task [@dai-le:2015:_semi; @howard-ruder:2018; @radford-etal:2018]. The advantage of these approaches is that few parameters need to be learned from scratch. At least partly due to this advantage, OpenAI GPT [@radford-etal:2018] achieved previously state-of-the-art results on many sentence-level tasks from the GLUE benchmark [@wang-etal:2018:_glue]. Left-to-right language modeling and auto-encoder objectives have been used for pre-training such models [@howard-ruder:2018; @radford-etal:2018; @dai-le:2015:_semi].

## Transfer Learning from Supervised Data

There has also been work showing effective transfer from supervised tasks with large datasets, such as natural language inference [@conneau-EtAl:2017:EMNLP2017] and machine translation [@mccann-etal:2017:_learn_trans]. Computer vision research has also demonstrated the importance of transfer learning from large pre-trained models, where an effective recipe is to fine-tune models pre-trained with ImageNet [@imagenet_cvpr09; @yosinski2014transferable].

# BERT {#sec:bert}

We introduce BERT and its detailed implementation in this section. There are two steps in our framework: *pre-training* and *fine-tuning*. During pre-training, the model is trained on unlabeled data over different pre-training tasks. For fine-tuning, the BERT model is first initialized with the pre-trained parameters, and all of the parameters are fine-tuned using labeled data from the downstream tasks. Each downstream task has separate fine-tuned models, even though they are initialized with the same pre-trained parameters. The question-answering example in Figure [1](#fig:bert_overall){reference-type="ref" reference="fig:bert_overall"} will serve as a running example for this section.

A distinctive feature of BERT is its unified architecture across different tasks. There is minimal difference between the pre-trained architecture and the final downstream architecture.

#### Model Architecture

BERT's model architecture is a multi-layer bidirectional Transformer encoder based on the original implementation described in @vaswani-etal:2017:_atten and released in the `tensor2tensor` library.[^1] Because the use of Transformers has become common and our implementation is almost identical to the original, we will omit an exhaustive background description of the model architecture and refer readers to @vaswani-etal:2017:_atten as well as excellent guides such as "The Annotated Transformer."[^2]

In this work, we denote the number of layers (i.e., Transformer blocks) as $L$, the hidden size as $H$, and the number of self-attention heads as $A$.[^3] We primarily report results on two model sizes: **BERT$_{\small \textsc{BASE}}$** (L=12, H=768, A=12, Total Parameters=110M) and **BERT$_{\small \textsc{LARGE}}$** (L=24, H=1024, A=16, Total Parameters=340M).

BERT$_{\small \textsc{BASE}}$ was chosen to have the same model size as OpenAI GPT for comparison purposes. Critically, however, the BERT Transformer uses bidirectional self-attention, while the GPT Transformer uses constrained self-attention where every token can only attend to context to its left.[^4]

#### Input/Output Representations

To make BERT handle a variety of down-stream tasks, our input representation is able to unambiguously represent both a single sentence and a pair of sentences (e.g., $\langle$ Question, Answer $\rangle$) in one token sequence. Throughout this work, a "sentence" can be an arbitrary span of contiguous text, rather than an actual linguistic sentence. A "sequence" refers to the input token sequence to BERT, which may be a single sentence or two sentences packed together.

We use WordPiece embeddings [@wu-etal:2016:_googl] with a 30,000 token vocabulary. The first token of every sequence is always a special classification token (`[CLS]`). The final hidden state corresponding to this token is used as the aggregate sequence representation for classification tasks. Sentence pairs are packed together into a single sequence. We differentiate the sentences in two ways. First, we separate them with a special token (`[SEP]`). Second, we add a learned embedding to every token indicating whether it belongs to sentence `A` or sentence `B`. As shown in Figure [1](#fig:bert_overall){reference-type="ref" reference="fig:bert_overall"}, we denote input embedding as $E$, the final hidden vector of the special `[CLS]` token as $C \in \mathbb{R}^{H}$, and the final hidden vector for the $i^{\rm th}$ input token as $T_i \in \mathbb{R}^H$.

For a given token, its input representation is constructed by summing the corresponding token, segment, and position embeddings. A visualization of this construction can be seen in Figure [2](#fig:input_embeddings){reference-type="ref" reference="fig:input_embeddings"}.

<figure id="fig:input_embeddings" data-latex-placement="ht">
<div class="center">
<embed src="/figures/bert-pretraining-deep-bidirectional-transformers/Input_Emebeddings.pdf" width="360" />
</div>
<figcaption>BERT input representation. The input embeddings are the sum of the token embeddings, the segmentation embeddings and the position embeddings.</figcaption>
</figure>

## Pre-training BERT {#sec:pretraining_tasks}

Unlike @peters-etal:2018:_deep and @radford-etal:2018, we do not use traditional left-to-right or right-to-left language models to pre-train BERT. Instead, we pre-train BERT using two unsupervised tasks, described in this section. This step is presented in the left part of Figure [1](#fig:bert_overall){reference-type="ref" reference="fig:bert_overall"}.

#### Task #1: Masked LM

Intuitively, it is reasonable to believe that a deep bidirectional model is strictly more powerful than either a left-to-right model or the shallow concatenation of a left-to-right and a right-to-left model. Unfortunately, standard conditional language models can only be trained left-to-right *or* right-to-left, since bidirectional conditioning would allow each word to indirectly "see itself", and the model could trivially predict the target word in a multi-layered context.

In order to train a deep bidirectional representation, we simply mask some percentage of the input tokens at random, and then predict those masked tokens. We refer to this procedure as a "masked LM" (MLM), although it is often referred to as a *Cloze* task in the literature [@taylor:1953:_cloze]. In this case, the final hidden vectors corresponding to the mask tokens are fed into an output softmax over the vocabulary, as in a standard LM. In all of our experiments, we mask 15% of all WordPiece tokens in each sequence at random. In contrast to denoising auto-encoders [@vincent:2008], we only predict the masked words rather than reconstructing the entire input.

Although this allows us to obtain a bidirectional pre-trained model, a downside is that we are creating a mismatch between pre-training and fine-tuning, since the `[MASK]` token does not appear during fine-tuning. To mitigate this, we do not always replace "masked" words with the actual `[MASK]` token. The training data generator chooses 15% of the token positions at random for prediction. If the $i$-th token is chosen, we replace the $i$-th token with (1) the `[MASK]` token 80% of the time (2) a random token 10% of the time (3) the unchanged $i$-th token 10% of the time. Then, $T_i$ will be used to predict the original token with cross entropy loss. We compare variations of this procedure in Appendix [9.2](#appendix:sec:different_masks){reference-type="ref" reference="appendix:sec:different_masks"}.

#### Task #2: Next Sentence Prediction (NSP)

Many important downstream tasks such as Question Answering (QA) and Natural Language Inference (NLI) are based on understanding the *relationship* between two sentences, which is not directly captured by language modeling. In order to train a model that understands sentence relationships, we pre-train for a binarized *next sentence prediction* task that can be trivially generated from any monolingual corpus. Specifically, when choosing the sentences `A` and `B` for each pre-training example, 50% of the time `B` is the actual next sentence that follows `A` (labeled as `IsNext`), and 50% of the time it is a random sentence from the corpus (labeled as `NotNext`). As we show in Figure [1](#fig:bert_overall){reference-type="ref" reference="fig:bert_overall"}, $C$ is used for next sentence prediction (NSP).[^5] Despite its simplicity, we demonstrate in Section [5.1](#sec:task_ablation){reference-type="ref" reference="sec:task_ablation"} that pre-training towards this task is very beneficial to both QA and NLI. [^6] The NSP task is closely related to representation-learning objectives used in @DBLP:journals/corr/JerniteBS17 and @logeswaran2018an. However, in prior work, only sentence embeddings are transferred to down-stream tasks, where BERT transfers all parameters to initialize end-task model parameters.

**Pre-training data** The pre-training procedure largely follows the existing literature on language model pre-training. For the pre-training corpus we use the BooksCorpus (800M words) [@zhu:2015] and English Wikipedia (2,500M words). For Wikipedia we extract only the text passages and ignore lists, tables, and headers. It is critical to use a document-level corpus rather than a shuffled sentence-level corpus such as the Billion Word Benchmark [@chelba-etal:2013:_one] in order to extract long contiguous sequences.

## Fine-tuning BERT {#sec:finetuning_procedure}

Fine-tuning is straightforward since the self-attention mechanism in the Transformer allows BERT to model many downstream tasks---whether they involve single text or text pairs---by swapping out the appropriate inputs and outputs. For applications involving text pairs, a common pattern is to independently encode text pairs before applying bidirectional cross attention, such as . BERT instead uses the self-attention mechanism to unify these two stages, as encoding a concatenated text pair with self-attention effectively includes *bidirectional* cross attention between two sentences.

For each task, we simply plug in the task-specific inputs and outputs into BERT and fine-tune all the parameters end-to-end. At the input, sentence `A` and sentence `B` from pre-training are analogous to (1) sentence pairs in paraphrasing, (2) hypothesis-premise pairs in entailment, (3) question-passage pairs in question answering, and (4) a degenerate text-$\varnothing$ pair in text classification or sequence tagging. At the output, the token representations are fed into an output layer for token-level tasks, such as sequence tagging or question answering, and the `[CLS]` representation is fed into an output layer for classification, such as entailment or sentiment analysis.

Compared to pre-training, fine-tuning is relatively inexpensive. All of the results in the paper can be replicated in at most 1 hour on a single Cloud TPU, or a few hours on a GPU, starting from the exact same pre-trained model.[^7] We describe the task-specific details in the corresponding subsections of Section [4](#sec:experiments){reference-type="ref" reference="sec:experiments"}. More details can be found in Appendix [7.5](#appendix:sec:fine_tune_details_and_figures){reference-type="ref" reference="appendix:sec:fine_tune_details_and_figures"}.

:::: table*
::: center
  -------------------------------- --------------- ---------- ---------- ---------- ---------- ---------- ---------- ---------- -------------
  System                             MNLI-(m/mm)      QQP        QNLI      SST-2       CoLA      STS-B       MRPC       RTE      **Average**
                                        392k          363k       108k       67k        8.5k       5.7k       3.5k       2.5k         \-
  Pre-OpenAI SOTA                     80.6/80.1       66.1       82.3       93.2       35.0       81.0       86.0       61.7        74.0
  BiLSTM+ELMo+Attn                    76.4/76.1       64.8       79.8       90.4       36.0       73.3       84.9       56.8        71.0
  OpenAI GPT                          82.1/81.4       70.3       87.4       91.3       45.4       80.0       82.3       56.0        75.1
  BERT$_{\small \textsc{BASE}}$       84.6/83.4       71.2       90.5       93.5       52.1       85.8       88.9       66.4        79.6
  BERT$_{\small \textsc{LARGE}}$    **86.7/85.9**   **72.1**   **92.7**   **94.9**   **60.5**   **86.5**   **89.3**   **70.1**    **82.1**
  -------------------------------- --------------- ---------- ---------- ---------- ---------- ---------- ---------- ---------- -------------
:::
::::

# Experiments {#sec:experiments}

In this section, we present BERT fine-tuning results on 11 NLP tasks.

## GLUE {#sec:glue}

The General Language Understanding Evaluation (GLUE) benchmark [@wang-etal:2018:_glue] is a collection of diverse natural language understanding tasks. Detailed descriptions of GLUE datasets are included in Appendix [8.1](#appendix:sec:glue){reference-type="ref" reference="appendix:sec:glue"}.

To fine-tune on GLUE, we represent the input sequence (for single sentence or sentence pairs) as described in Section [3](#sec:bert){reference-type="ref" reference="sec:bert"}, and use the final hidden vector $C \in \mathbb{R}^{H}$ corresponding to the first input token (`[CLS]`) as the aggregate representation. The only new parameters introduced during fine-tuning are classification layer weights $W \in \mathbb{R}^{K \times H}$, where $K$ is the number of labels. We compute a standard classification loss with $C$ and $W$, i.e., $\log({\rm softmax}(CW^T))$.

We use a batch size of 32 and fine-tune for 3 epochs over the data for all GLUE tasks. For each task, we selected the best fine-tuning learning rate (among 5e-5, 4e-5, 3e-5, and 2e-5) on the Dev set. Additionally, for BERT$_{\small \textsc{LARGE}}$ we found that fine-tuning was sometimes unstable on small datasets, so we ran several random restarts and selected the best model on the Dev set. With random restarts, we use the same pre-trained checkpoint but perform different fine-tuning data shuffling and classifier layer initialization.[^8]

Results are presented in Table [\[tab:glue_official\]](#tab:glue_official){reference-type="ref" reference="tab:glue_official"}. Both BERT$_{\small \textsc{BASE}}$ and BERT$_{\small \textsc{LARGE}}$ outperform all systems on all tasks by a substantial margin, obtaining 4.5% and 7.0% respective average accuracy improvement over the prior state of the art. Note that BERT$_{\small \textsc{BASE}}$ and OpenAI GPT are nearly identical in terms of model architecture apart from the attention masking. For the largest and most widely reported GLUE task, MNLI, BERT obtains a 4.6% absolute accuracy improvement. On the official GLUE leaderboard[^9], BERT$_{\small \textsc{LARGE}}$ obtains a score of 80.5, compared to OpenAI GPT, which obtains 72.8 as of the date of writing.

We find that BERT$_{\small \textsc{LARGE}}$ significantly outperforms BERT$_{\small \textsc{BASE}}$ across all tasks, especially those with very little training data. The effect of model size is explored more thoroughly in Section [5.2](#sec:model_size_ablation){reference-type="ref" reference="sec:model_size_ablation"}.

## SQuAD v1.1 {#sec:squad}

The Stanford Question Answering Dataset (SQuAD v1.1) is a collection of 100k crowdsourced question/answer pairs [@rajpurkar-etal:2016:_squad]. Given a question and a passage from Wikipedia containing the answer, the task is to predict the answer text span in the passage.

As shown in Figure [1](#fig:bert_overall){reference-type="ref" reference="fig:bert_overall"}, in the question answering task, we represent the input question and passage as a single packed sequence, with the question using the `A` embedding and the passage using the `B` embedding. We only introduce a start vector $S \in \mathbb{R}^H$ and an end vector $E \in \mathbb{R}^H$ during fine-tuning. The probability of word $i$ being the start of the answer span is computed as a dot product between $T_i$ and $S$ followed by a softmax over all of the words in the paragraph: $P_i = \frac{e^{S{\cdot}T_i}}{\sum_j e^{S{\cdot}T_j}}$. The analogous formula is used for the end of the answer span. The score of a candidate span from position $i$ to position $j$ is defined as $S{\cdot}T_i + E{\cdot}T_j$, and the maximum scoring span where $j \geq i$ is used as a prediction. The training objective is the sum of the log-likelihoods of the correct start and end positions. We fine-tune for 3 epochs with a learning rate of 5e-5 and a batch size of 32.

::: center
+:----------------------------------------------+:--------:+:--------:+:--------:+:--------:+
| System                                        | Dev                 | Test                |
+-----------------------------------------------+----------+----------+----------+----------+
|                                               | EM       | F1       | EM       | F1       |
+-----------------------------------------------+----------+----------+----------+----------+
| Top Leaderboard Systems (Dec 10th, 2018)                                                  |
+-----------------------------------------------+----------+----------+----------+----------+
| Human                                         | \-       | \-       | 82.3     | 91.2     |
+-----------------------------------------------+----------+----------+----------+----------+
| #1 Ensemble - nlnet                           | \-       | \-       | 86.0     | 91.7     |
+-----------------------------------------------+----------+----------+----------+----------+
| #2 Ensemble - QANet                           | \-       | \-       | 84.5     | 90.5     |
+-----------------------------------------------+----------+----------+----------+----------+
| Published                                                                                 |
+-----------------------------------------------+----------+----------+----------+----------+
| BiDAF+ELMo (Single)                           | \-       | 85.6     | \-       | 85.8     |
+-----------------------------------------------+----------+----------+----------+----------+
| R.M. Reader (Ensemble)                        | 81.2     | 87.9     | 82.3     | 88.5     |
+-----------------------------------------------+----------+----------+----------+----------+
| Ours                                                                                      |
+-----------------------------------------------+----------+----------+----------+----------+
| BERT$_{\small \textsc{BASE}}$(Single)         | 80.8     | 88.5     | \-       | \-       |
+-----------------------------------------------+----------+----------+----------+----------+
| BERT$_{\small \textsc{LARGE}}$(Single)        | 84.1     | 90.9     | \-       | \-       |
+-----------------------------------------------+----------+----------+----------+----------+
| BERT$_{\small \textsc{LARGE}}$(Ensemble)      | 85.8     | 91.8     | \-       | \-       |
+-----------------------------------------------+----------+----------+----------+----------+
| BERT$_{\small \textsc{LARGE}}$(Sgl.+TriviaQA) | **84.2** | **91.1** | **85.1** | **91.8** |
+-----------------------------------------------+----------+----------+----------+----------+
| BERT$_{\small \textsc{LARGE}}$(Ens.+TriviaQA) | **86.2** | **92.2** | **87.4** | **93.2** |
+-----------------------------------------------+----------+----------+----------+----------+

: SQuAD 1.1 results. The BERT ensemble is 7x systems which use different pre-training checkpoints and fine-tuning seeds. {#tab:squad_results}
:::

::: center
+:---------------------------------------+:--------:+:--------:+:--------:+:--------:+
| System                                 | Dev                 | Test                |
+----------------------------------------+----------+----------+----------+----------+
|                                        | EM       | F1       | EM       | F1       |
+----------------------------------------+----------+----------+----------+----------+
| Top Leaderboard Systems (Dec 10th, 2018)                                           |
+----------------------------------------+----------+----------+----------+----------+
| Human                                  | 86.3     | 89.0     | 86.9     | 89.5     |
+----------------------------------------+----------+----------+----------+----------+
| #1 Single - MIR-MRC (F-Net)            | \-       | \-       | 74.8     | 78.0     |
+----------------------------------------+----------+----------+----------+----------+
| #2 Single - nlnet                      | \-       | \-       | 74.2     | 77.1     |
+----------------------------------------+----------+----------+----------+----------+
| Published                                                                          |
+----------------------------------------+----------+----------+----------+----------+
| unet (Ensemble)                        | \-       | \-       | 71.4     | 74.9     |
+----------------------------------------+----------+----------+----------+----------+
| SLQA+ (Single)                         | \-       |          | 71.4     | 74.4     |
+----------------------------------------+----------+----------+----------+----------+
| Ours                                                                               |
+----------------------------------------+----------+----------+----------+----------+
| BERT$_{\small \textsc{LARGE}}$(Single) | 78.7     | 81.9     | 80.0     | 83.1     |
+----------------------------------------+----------+----------+----------+----------+

: SQuAD 2.0 results. We exclude entries that use BERT as one of their components. {#tab:squad2_results}
:::

Table [1](#tab:squad_results){reference-type="ref" reference="tab:squad_results"} shows top leaderboard entries as well as results from top published systems [@bidaf; @clark-gardner:2018:_simpl; @peters-etal:2018:_deep; @hu2017reinforced]. The top results from the SQuAD leaderboard do not have up-to-date public system descriptions available,[^10] and are allowed to use any public data when training their systems. We therefore use modest data augmentation in our system by first fine-tuning on TriviaQA [@joshi-etal:2017:_triviaq] befor fine-tuning on SQuAD.

Our best performing system outperforms the top leaderboard system by +1.5 F1 in ensembling and +1.3 F1 as a single system. In fact, our single BERT model outperforms the top ensemble system in terms of F1 score. Without TriviaQA fine-tuning data, we only lose 0.1-0.4 F1, still outperforming all existing systems by a wide margin.[^11]

## SQuAD v2.0

The SQuAD 2.0 task extends the SQuAD 1.1 problem definition by allowing for the possibility that no short answer exists in the provided paragraph, making the problem more realistic.

We use a simple approach to extend the SQuAD v1.1 BERT model for this task. We treat questions that do not have an answer as having an answer span with start and end at the `[CLS]` token. The probability space for the start and end answer span positions is extended to include the position of the `[CLS]` token. For prediction, we compare the score of the no-answer span: $s_{\tt null} = S{\cdot}C + E{\cdot}C$ to the score of the best non-null span $\hat{s_{i,j}}$ = ${\tt max}_{j \geq i} S{\cdot}T_i + E{\cdot}T_j$. We predict a non-null answer when $\hat{s_{i,j}} > s_{\tt null} + \tau$, where the threshold $\tau$ is selected on the dev set to maximize F1. We did not use TriviaQA data for this model. We fine-tuned for 2 epochs with a learning rate of 5e-5 and a batch size of 48.

The results compared to prior leaderboard entries and top published work [@unet; @slqa] are shown in Table [2](#tab:squad2_results){reference-type="ref" reference="tab:squad2_results"}, excluding systems that use BERT as one of their components. We observe a +5.1 F1 improvement over the previous best system.

## SWAG {#sec:swag}

The Situations With Adversarial Generations (SWAG) dataset contains 113k sentence-pair completion examples that evaluate grounded commonsense inference [@zellers2018swag]. Given a sentence, the task is to choose the most plausible continuation among four choices.

When fine-tuning on the SWAG dataset, we construct four input sequences, each containing the concatenation of the given sentence (sentence `A`) and a possible continuation (sentence `B`). The only task-specific parameters introduced is a vector whose dot product with the `[CLS]` token representation $C$ denotes a score for each choice which is normalized with a softmax layer.

We fine-tune the model for 3 epochs with a learning rate of 2e-5 and a batch size of 16. Results are presented in Table [3](#tab:swag_official){reference-type="ref" reference="tab:swag_official"}. BERT$_{\small \textsc{LARGE}}$ outperforms the authors' baseline ESIM+ELMo system by +27.1% and OpenAI GPT by 8.3%.

::: center
  System                               Dev        Test
  --------------------------------- ---------- ----------
  ESIM+GloVe                           51.9       52.7
  ESIM+ELMo                            59.1       59.2
  OpenAI GPT                            \-        78.0
  BERT$_{\small \textsc{BASE}}$        81.6        \-
  BERT$_{\small \textsc{LARGE}}$     **86.6**   **86.3**
  Human (expert)$^\dagger$              \-        85.0
  Human (5 annotations)$^\dagger$       \-        88.0

  : SWAG Dev and Test accuracies. $^\dagger$Human performance is measured with 100 samples, as reported in the SWAG paper. {#tab:swag_official}
:::

# Ablation Studies {#sec:ablation}

In this section, we perform ablation experiments over a number of facets of BERT in order to better understand their relative importance. Additional ablation studies can be found in Appendix [9](#appendix:sec:more_ablation_studies){reference-type="ref" reference="appendix:sec:more_ablation_studies"}.

## Effect of Pre-training Tasks {#sec:task_ablation}

We demonstrate the importance of the deep bidirectionality of BERT by evaluating two pre-training objectives using exactly the same pre-training data, fine-tuning scheme, and hyperparameters as BERT$_{\small \textsc{BASE}}$:\
**No NSP**: A bidirectional model which is trained using the "masked LM" (MLM) but without the "next sentence prediction" (NSP) task.\
**LTR & No NSP**: A left-context-only model which is trained using a standard Left-to-Right (LTR) LM, rather than an MLM. The left-only constraint was also applied at fine-tuning, because removing it introduced a pre-train/fine-tune mismatch that degraded downstream performance. Additionally, this model was pre-trained without the NSP task. This is directly comparable to OpenAI GPT, but using our larger training dataset, our input representation, and our fine-tuning scheme.

+:------------------------------+:------:+:-----:+:-----:+:-----:+:-----:+
|                               | Dev Set                                |
+-------------------------------+--------+-------+-------+-------+-------+
| Tasks                         | MNLI-m | QNLI  | MRPC  | SST-2 | SQuAD |
+-------------------------------+--------+-------+-------+-------+-------+
|                               | (Acc)  | (Acc) | (Acc) | (Acc) | (F1)  |
+-------------------------------+--------+-------+-------+-------+-------+
| BERT$_{\small \textsc{BASE}}$ | 84.4   | 88.4  | 86.7  | 92.7  | 88.5  |
+-------------------------------+--------+-------+-------+-------+-------+
| No NSP                        | 83.9   | 84.9  | 86.5  | 92.6  | 87.9  |
+-------------------------------+--------+-------+-------+-------+-------+
| LTR & No NSP                  | 82.1   | 84.3  | 77.5  | 92.1  | 77.8  |
+-------------------------------+--------+-------+-------+-------+-------+
| \+ BiLSTM                     | 82.1   | 84.1  | 75.7  | 91.6  | 84.9  |
+-------------------------------+--------+-------+-------+-------+-------+

: Ablation over the pre-training tasks using the BERT$_{\small \textsc{BASE}}$ architecture. "No NSP" is trained without the next sentence prediction task. "LTR & No NSP" is trained as a left-to-right LM without the next sentence prediction, like OpenAI GPT. "+ BiLSTM" adds a randomly initialized BiLSTM on top of the "LTR + No NSP" model during fine-tuning. {#tab:task_ablation}

We first examine the impact brought by the NSP task. In Table [4](#tab:task_ablation){reference-type="ref" reference="tab:task_ablation"}, we show that removing NSP hurts performance significantly on QNLI, MNLI, and SQuAD 1.1. Next, we evaluate the impact of training bidirectional representations by comparing "No NSP" to "LTR & No NSP". The LTR model performs worse than the MLM model on all tasks, with large drops on MRPC and SQuAD.

For SQuAD it is intuitively clear that a LTR model will perform poorly at token predictions, since the token-level hidden states have no right-side context. In order to make a good faith attempt at strengthening the LTR system, we added a randomly initialized BiLSTM on top. This does significantly improve results on SQuAD, but the results are still far worse than those of the pre-trained bidirectional models. The BiLSTM hurts performance on the GLUE tasks.

We recognize that it would also be possible to train separate LTR and RTL models and represent each token as the concatenation of the two models, as ELMo does. However: (a) this is twice as expensive as a single bidirectional model; (b) this is non-intuitive for tasks like QA, since the RTL model would not be able to condition the answer on the question; (c) this it is strictly less powerful than a deep bidirectional model, since it can use both left and right context at every layer.

## Effect of Model Size {#sec:model_size_ablation}

In this section, we explore the effect of model size on fine-tuning task accuracy. We trained a number of BERT models with a differing number of layers, hidden units, and attention heads, while otherwise using the same hyperparameters and training procedure as described previously.

Results on selected GLUE tasks are shown in Table [5](#tab:size_ablation){reference-type="ref" reference="tab:size_ablation"}. In this table, we report the average Dev Set accuracy from 5 random restarts of fine-tuning. We can see that larger models lead to a strict accuracy improvement across all four datasets, even for MRPC which only has 3,600 labeled training examples, and is substantially different from the pre-training tasks. It is also perhaps surprising that we are able to achieve such significant improvements on top of models which are already quite large relative to the existing literature. For example, the largest Transformer explored in @vaswani-etal:2017:_atten is (L=6, H=1024, A=16) with 100M parameters for the encoder, and the largest Transformer we have found in the literature is (L=64, H=512, A=2) with 235M parameters [@alrfou:2018]. By contrast, BERT$_{\small \textsc{BASE}}$ contains 110M parameters and BERT$_{\small \textsc{LARGE}}$ contains 340M parameters.

::: center
+-----------------------+----------+--------------------------+
| Hyperparams           |          | Dev Set Accuracy         |
+======:+======:+======:+:========:+:======:+:======:+:======:+
| #L    | #H    | #A    | LM (ppl) | MNLI-m | MRPC   | SST-2  |
+-------+-------+-------+----------+--------+--------+--------+
|  3    | 768   | 12    | 5.84     | 77.9   | 79.8   | 88.4   |
+-------+-------+-------+----------+--------+--------+--------+
| 6     | 768   | 3     | 5.24     | 80.6   | 82.2   | 90.7   |
+-------+-------+-------+----------+--------+--------+--------+
| 6     | 768   | 12    | 4.68     | 81.9   | 84.8   | 91.3   |
+-------+-------+-------+----------+--------+--------+--------+
| 12    | 768   | 12    | 3.99     | 84.4   | 86.7   | 92.9   |
+-------+-------+-------+----------+--------+--------+--------+
| 12    | 1024  | 16    | 3.54     | 85.7   | 86.9   | 93.3   |
+-------+-------+-------+----------+--------+--------+--------+
| 24    | 1024  | 16    | 3.23     | 86.6   | 87.8   | 93.7   |
+-------+-------+-------+----------+--------+--------+--------+

: Ablation over BERT model size. #L = the number of layers; #H = hidden size; #A = number of attention heads. "LM (ppl)" is the masked LM perplexity of held-out training data. {#tab:size_ablation}
:::

It has long been known that increasing the model size will lead to continual improvements on large-scale tasks such as machine translation and language modeling, which is demonstrated by the LM perplexity of held-out training data shown in Table [5](#tab:size_ablation){reference-type="ref" reference="tab:size_ablation"}. However, we believe that this is the first work to demonstrate convincingly that scaling to extreme model sizes also leads to large improvements on very small scale tasks, provided that the model has been sufficiently pre-trained. @peters2018dissecting presented mixed results on the downstream task impact of increasing the pre-trained bi-LM size from two to four layers and @melamud2016context2vec mentioned in passing that increasing hidden dimension size from 200 to 600 helped, but increasing further to 1,000 did not bring further improvements. Both of these prior works used a feature-based approach --- we hypothesize that when the model is fine-tuned directly on the downstream tasks and uses only a very small number of randomly initialized additional parameters, the task-specific models can benefit from the larger, more expressive pre-trained representations even when downstream task data is very small.

## Feature-based Approach with BERT {#sec:ner}

All of the BERT results presented so far have used the fine-tuning approach, where a simple classification layer is added to the pre-trained model, and all parameters are jointly fine-tuned on a downstream task. However, the feature-based approach, where fixed features are extracted from the pre-trained model, has certain advantages. First, not all tasks can be easily represented by a Transformer encoder architecture, and therefore require a task-specific model architecture to be added. Second, there are major computational benefits to pre-compute an expensive representation of the training data once and then run many experiments with cheaper models on top of this representation.

In this section, we compare the two approaches by applying BERT to the CoNLL-2003 Named Entity Recognition (NER) task [@tjong-de:2003]. In the input to BERT, we use a case-preserving WordPiece model, and we include the maximal document context provided by the data. Following standard practice, we formulate this as a tagging task but do not use a CRF layer in the output. We use the representation of the first sub-token as the input to the token-level classifier over the NER label set.

To ablate the fine-tuning approach, we apply the feature-based approach by extracting the activations from one or more layers *without* fine-tuning any parameters of BERT. These contextual embeddings are used as input to a randomly initialized two-layer 768-dimensional BiLSTM before the classification layer.

Results are presented in Table [6](#tab:pretrained_embeddings){reference-type="ref" reference="tab:pretrained_embeddings"}. BERT$_{\small \textsc{LARGE}}$ performs competitively with state-of-the-art methods. The best performing method concatenates the token representations from the top four hidden layers of the pre-trained Transformer, which is only 0.3 F1 behind fine-tuning the entire model. This demonstrates that BERT is effective for both fine-tuning and feature-based approaches.

  System                                                    Dev F1   Test F1
  -------------------------------------------------------- -------- ----------
  ELMo [@peters-etal:2018:_deep]                             95.7      92.2
  CVT [@clark2018semi]                                        \-       92.6
  CSE [@akbik2018contextual]                                  \-     **93.1**
  Fine-tuning approach                                              
  BERT$_{\small \textsc{LARGE}}$                             96.6      92.8
  BERT$_{\small \textsc{BASE}}$                              96.4      92.4
  Feature-based approach (BERT$_{\small \textsc{BASE}}$)            
  Embeddings                                                 91.0       \-
  Second-to-Last Hidden                                      95.6       \-
  Last Hidden                                                94.9       \-
  Weighted Sum Last Four Hidden                              95.9       \-
  Concat Last Four Hidden                                    96.1       \-
  Weighted Sum All 12 Layers                                 95.5       \-

  : CoNLL-2003 Named Entity Recognition results. Hyperparameters were selected using the Dev set. The reported Dev and Test scores are averaged over 5 random restarts using those hyperparameters. {#tab:pretrained_embeddings}

[]{#tab:pretrained_embeddings label="tab:pretrained_embeddings"}

# Conclusion

Recent empirical improvements due to transfer learning with language models have demonstrated that rich, unsupervised pre-training is an integral part of many language understanding systems. In particular, these results enable even low-resource tasks to benefit from deep unidirectional architectures. Our major contribution is further generalizing these findings to deep *bidirectional* architectures, allowing the same pre-trained model to successfully tackle a broad set of NLP tasks.

::: center
**Appendix for "BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding"**
:::

We organize the appendix into three sections:

- Additional implementation details for BERT are presented in Appendix [7](#appendix:sec:bert_description){reference-type="ref" reference="appendix:sec:bert_description"};

- Additional details for our experiments are presented in Appendix [8](#appendix:sec:exp_details){reference-type="ref" reference="appendix:sec:exp_details"}; and

- Additional ablation studies are presented in Appendix [9](#appendix:sec:more_ablation_studies){reference-type="ref" reference="appendix:sec:more_ablation_studies"}.

  We present additional ablation studies for BERT including:

  - Effect of Number of Training Steps; and

  - Ablation for Different Masking Procedures.

# Additional Details for BERT {#appendix:sec:bert_description}

<figure id="fig:BERT_comparisons" data-latex-placement="ht">
<div class="center">
<embed src="/figures/bert-pretraining-deep-bidirectional-transformers/BERT_comparisons.pdf" />
</div>
<figcaption>Differences in pre-training model architectures. BERT uses a bidirectional Transformer. OpenAI GPT uses a left-to-right Transformer. ELMo uses the concatenation of independently trained left-to-right and right-to-left LSTMs to generate features for downstream tasks. Among the three, only BERT representations are jointly conditioned on both left and right context in all layers. In addition to the architecture differences, BERT and OpenAI GPT are fine-tuning approaches, while ELMo is a feature-based approach.</figcaption>
</figure>

## Illustration of the Pre-training Tasks

We provide examples of the pre-training tasks in the following.

#### Masked LM and the Masking Procedure

Assuming the unlabeled sentence is `my dog is hairy`, and during the random masking procedure we chose the 4-th token (which corresponding to `hairy`), our masking procedure can be further illustrated by

- 80% of the time: Replace the word with the `[MASK]` token, e.g., `my dog is hairy `$\rightarrow$` my dog is [MASK]`

- 10% of the time: Replace the word with a random word, e.g., `my dog is hairy `$\rightarrow$` my dog is apple`

- 10% of the time: Keep the word unchanged, e.g., `my dog is hairy `$\rightarrow$` my dog is hairy`. The purpose of this is to bias the representation towards the actual observed word.

The advantage of this procedure is that the Transformer encoder does not know which words it will be asked to predict or which have been replaced by random words, so it is forced to keep a distributional contextual representation of *every* input token. Additionally, because random replacement only occurs for 1.5% of all tokens (i.e., 10% of 15%), this does not seem to harm the model's language understanding capability. In Section [9.2](#appendix:sec:different_masks){reference-type="ref" reference="appendix:sec:different_masks"}, we evaluate the impact this procedure.

Compared to standard langauge model training, the masked LM only make predictions on 15% of tokens in each batch, which suggests that more pre-training steps may be required for the model to converge. In Section [9.1](#sec:num_training_steps){reference-type="ref" reference="sec:num_training_steps"} we demonstrate that MLM does converge marginally slower than a left-to-right model (which predicts every token), but the empirical improvements of the MLM model far outweigh the increased training cost.

#### Next Sentence Prediction

The next sentence prediction task can be illustrated in the following examples. $$\begin{align*}
\text{Input\;} &= \text{\tt {\scriptsize [CLS] the man went to [MASK] store [SEP]}} \\ 
& \text{\tt {\scriptsize \;\;\;\;\;\;\;he bought a gallon [MASK] milk [SEP]}}\\
\text{Label} &= \text{\tt {\scriptsize IsNext}} \\
\\
\text{Input\;} &= \text{\tt {\scriptsize [CLS] the man [MASK] to the store [SEP]}}\\
&\text{\tt {\scriptsize \;\;\;\;\;\;\;penguin [MASK] are flight \#\#less birds [SEP]}}\\
\text{Label} &= \text{\tt {\scriptsize NotNext}}
\end{align*}$$

## Pre-training Procedure {#sec:pretraining_procedure}

To generate each training input sequence, we sample two spans of text from the corpus, which we refer to as "sentences" even though they are typically much longer than single sentences (but can be shorter also). The first sentence receives the `A` embedding and the second receives the `B` embedding. 50% of the time `B` is the actual next sentence that follows `A` and 50% of the time it is a random sentence, which is done for the "next sentence prediction" task. They are sampled such that the combined length is $\le$ 512 tokens. The LM masking is applied after WordPiece tokenization with a uniform masking rate of 15%, and no special consideration given to partial word pieces.

We train with batch size of 256 sequences (256 sequences \* 512 tokens = 128,000 tokens/batch) for 1,000,000 steps, which is approximately 40 epochs over the 3.3 billion word corpus. We use Adam with learning rate of 1e-4, ${\beta}_1=0.9$, ${\beta}_2=0.999$, L2 weight decay of $0.01$, learning rate warmup over the first 10,000 steps, and linear decay of the learning rate. We use a dropout probability of 0.1 on all layers. We use a `gelu` activation [@hendrycks:2016] rather than the standard `relu`, following OpenAI GPT. The training loss is the sum of the mean masked LM likelihood and the mean next sentence prediction likelihood.

Training of BERT$_{\small \textsc{BASE}}$ was performed on 4 Cloud TPUs in Pod configuration (16 TPU chips total).[^12] Training of BERT$_{\small \textsc{LARGE}}$ was performed on 16 Cloud TPUs (64 TPU chips total). Each pre-training took 4 days to complete.

Longer sequences are disproportionately expensive because attention is quadratic to the sequence length. To speed up pretraing in our experiments, we pre-train the model with sequence length of 128 for 90% of the steps. Then, we train the rest 10% of the steps of sequence of 512 to learn the positional embeddings.

## Fine-tuning Procedure

For fine-tuning, most model hyperparameters are the same as in pre-training, with the exception of the batch size, learning rate, and number of training epochs. The dropout probability was always kept at 0.1. The optimal hyperparameter values are task-specific, but we found the following range of possible values to work well across all tasks:

- **Batch size**: 16, 32

- **Learning rate (Adam)**: 5e-5, 3e-5, 2e-5

- **Number of epochs**: 2, 3, 4

We also observed that large data sets (e.g., 100k+ labeled training examples) were far less sensitive to hyperparameter choice than small data sets. Fine-tuning is typically very fast, so it is reasonable to simply run an exhaustive search over the above parameters and choose the model that performs best on the development set.

## Comparison of BERT, ELMo ,and OpenAI GPT {#appendix:sec:comparing_bert_and_openai}

Here we studies the differences in recent popular representation learning models including ELMo, OpenAI GPT and BERT. The comparisons between the model architectures are shown visually in Figure [3](#fig:BERT_comparisons){reference-type="ref" reference="fig:BERT_comparisons"}. Note that in addition to the architecture differences, BERT and OpenAI GPT are fine-tuning approaches, while ELMo is a feature-based approach.

The most comparable existing pre-training method to BERT is OpenAI GPT, which trains a left-to-right Transformer LM on a large text corpus. In fact, many of the design decisions in BERT were intentionally made to make it as close to GPT as possible so that the two methods could be minimally compared. The core argument of this work is that the bi-directionality and the two pre-training tasks presented in Section [3.1](#sec:pretraining_tasks){reference-type="ref" reference="sec:pretraining_tasks"} account for the majority of the empirical improvements, but we do note that there are several other differences between how BERT and GPT were trained:

- GPT is trained on the BooksCorpus (800M words); BERT is trained on the BooksCorpus (800M words) and Wikipedia (2,500M words).

- GPT uses a sentence separator (`[SEP]`) and classifier token (`[CLS]`) which are only introduced at fine-tuning time; BERT learns `[SEP]`, `[CLS]` and sentence `A`/`B` embeddings during pre-training.

- GPT was trained for 1M steps with a batch size of 32,000 words; BERT was trained for 1M steps with a batch size of 128,000 words.

- GPT used the same learning rate of 5e-5 for all fine-tuning experiments; BERT chooses a task-specific fine-tuning learning rate which performs the best on the development set.

To isolate the effect of these differences, we perform ablation experiments in Section [5.1](#sec:task_ablation){reference-type="ref" reference="sec:task_ablation"} which demonstrate that the majority of the improvements are in fact coming from the two pre-training tasks and the bidirectionality they enable.

## Illustrations of Fine-tuning on Different Tasks {#appendix:sec:fine_tune_details_and_figures}

The illustration of fine-tuning BERT on different tasks can be seen in Figure [4](#fig:bert_fine_tune){reference-type="ref" reference="fig:bert_fine_tune"}. Our task-specific models are formed by incorporating BERT with one additional output layer, so a minimal number of parameters need to be learned from scratch. Among the tasks, (a) and (b) are sequence-level tasks while (c) and (d) are token-level tasks. In the figure, $E$ represents the input embedding, $T_i$ represents the contextual representation of token $i$, [\[CLS\]]{.smallcaps} is the special symbol for classification output, and [\[SEP\]]{.smallcaps} is the special symbol to separate non-consecutive token sequences.

<figure id="fig:bert_fine_tune" data-latex-placement="ht">
<div class="center">
<embed src="/figures/bert-pretraining-deep-bidirectional-transformers/BERT_fine_tune.pdf" style="width:85.0%" />
</div>
<figcaption>Illustrations of Fine-tuning BERT on Different Tasks.</figcaption>
</figure>

# Detailed Experimental Setup {#appendix:sec:exp_details}

## Detailed Descriptions for the GLUE Benchmark Experiments. {#appendix:sec:glue}

Our GLUE results in Table[\[tab:glue_official\]](#tab:glue_official){reference-type="ref" reference="tab:glue_official"} are obtained from <https://gluebenchmark.com/leaderboard> and <https://blog.openai.com/language-unsupervised>. The GLUE benchmark includes the following datasets, the descriptions of which were originally summarized in @wang-etal:2018:_glue:

#### MNLI

Multi-Genre Natural Language Inference is a large-scale, crowdsourced entailment classification task [@williams-nangia-bowman:2018]. Given a pair of sentences, the goal is to predict whether the second sentence is an *entailment*, *contradiction*, or *neutral* with respect to the first one.

#### QQP

Quora Question Pairs is a binary classification task where the goal is to determine if two questions asked on Quora are semantically equivalent [@chen-etal:2018:_quora].

#### QNLI

Question Natural Language Inference is a version of the Stanford Question Answering Dataset [@rajpurkar-etal:2016:_squad] which has been converted to a binary classification task [@wang-etal:2018:_glue]. The positive examples are (question, sentence) pairs which do contain the correct answer, and the negative examples are (question, sentence) from the same paragraph which do not contain the answer.

#### SST-2

The Stanford Sentiment Treebank is a binary single-sentence classification task consisting of sentences extracted from movie reviews with human annotations of their sentiment [@socher-etal:2013:_recur].

#### CoLA

The Corpus of Linguistic Acceptability is a binary single-sentence classification task, where the goal is to predict whether an English sentence is linguistically "acceptable" or not [@warstadt-singh-bowman:2018:_corpus].

#### STS-B

The Semantic Textual Similarity Benchmark is a collection of sentence pairs drawn from news headlines and other sources [@cer-etal:2017]. They were annotated with a score from 1 to 5 denoting how similar the two sentences are in terms of semantic meaning.

#### MRPC

Microsoft Research Paraphrase Corpus consists of sentence pairs automatically extracted from online news sources, with human annotations for whether the sentences in the pair are semantically equivalent [@dolan-brockett:2005:_autom].

#### RTE

Recognizing Textual Entailment is a binary entailment task similar to MNLI, but with much less training data [@bentivogli-etal:2009].[^13]

#### WNLI

Winograd NLI is a small natural language inference dataset [@levesque-davis-morgenstern:2011:_winog]. The GLUE webpage notes that there are issues with the construction of this dataset, [^14] and every trained system that's been submitted to GLUE has performed worse than the 65.1 baseline accuracy of predicting the majority class. We therefore exclude this set to be fair to OpenAI GPT. For our GLUE submission, we always predicted the majority class.

# Additional Ablation Studies {#appendix:sec:more_ablation_studies}

## Effect of Number of Training Steps {#sec:num_training_steps}

Figure [5](#fig:step_abalation){reference-type="ref" reference="fig:step_abalation"} presents MNLI Dev accuracy after fine-tuning from a checkpoint that has been pre-trained for $k$ steps. This allows us to answer the following questions:

<figure id="fig:step_abalation" data-latex-placement="b">

<figcaption>Ablation over number of training steps. This shows the MNLI accuracy after fine-tuning, starting from model parameters that have been pre-trained for <span class="math inline"><em>k</em></span> steps. The x-axis is the value of <span class="math inline"><em>k</em></span>.</figcaption>
</figure>

1.  Question: Does BERT really need such a large amount of pre-training (128,000 words/batch \* 1,000,000 steps) to achieve high fine-tuning accuracy?\
    Answer: Yes, BERT$_{\small \textsc{BASE}}$ achieves almost 1.0% additional accuracy on MNLI when trained on 1M steps compared to 500k steps.

2.  Question: Does MLM pre-training converge slower than LTR pre-training, since only 15% of words are predicted in each batch rather than every word?\
    Answer: The MLM model does converge slightly slower than the LTR model. However, in terms of absolute accuracy the MLM model begins to outperform the LTR model almost immediately.

## Ablation for Different Masking Procedures {#appendix:sec:different_masks}

In Section [3.1](#sec:pretraining_tasks){reference-type="ref" reference="sec:pretraining_tasks"}, we mention that BERT uses a mixed strategy for masking the target tokens when pre-training with the masked language model (MLM) objective. The following is an ablation study to evaluate the effect of different masking strategies.

Note that the purpose of the masking strategies is to reduce the mismatch between pre-training and fine-tuning, as the `[MASK]` symbol never appears during the fine-tuning stage. We report the Dev results for both MNLI and NER. For NER, we report both fine-tuning and feature-based approaches, as we expect the mismatch will be amplified for the feature-based approach as the model will not have the chance to adjust the representations.

::: center
+-------------------------------------------------------------------------------------+---------------------------------------+
| Masking Rates                                                                       | Dev Set Results                       |
+===========================================:+===================:+==================:+:=========:+:=========:+:=============:+
| (r0.2cm)1-3 (l0.2cm)4-6 [Mask]{.smallcaps} | [Same]{.smallcaps} | [Rnd]{.smallcaps} | MNLI      | NER                       |
+--------------------------------------------+--------------------+-------------------+-----------+-----------+---------------+
|                                            |                    |                   | Fine-tune | Fine-tune | Feature-based |
+--------------------------------------------+--------------------+-------------------+-----------+-----------+---------------+
| (r0.2cm)1-3 (l0.1cmr0.1cm)4-4 (l0.2cm)5-6  | 10%                | 10%               | 84.2      | 95.4      | 94.9          |
|                                            |                    |                   |           |           |               |
| 80%                                        |                    |                   |           |           |               |
+--------------------------------------------+--------------------+-------------------+-----------+-----------+---------------+
| 100%                                       | 0%                 | 0%                | 84.3      | 94.9      | 94.0          |
+--------------------------------------------+--------------------+-------------------+-----------+-----------+---------------+
| 80%                                        | 0%                 | 20%               | 84.1      | 95.2      | 94.6          |
+--------------------------------------------+--------------------+-------------------+-----------+-----------+---------------+
| 80%                                        | 20%                | 0%                | 84.4      | 95.2      | 94.7          |
+--------------------------------------------+--------------------+-------------------+-----------+-----------+---------------+
| 0%                                         | 20%                | 80%               | 83.7      | 94.8      | 94.6          |
+--------------------------------------------+--------------------+-------------------+-----------+-----------+---------------+
| 0%                                         | 0%                 | 100%              | 83.6      | 94.9      | 94.6          |
+--------------------------------------------+--------------------+-------------------+-----------+-----------+---------------+

: Ablation over different masking strategies. {#tab:mask_ablation}
:::

The results are presented in Table [7](#tab:mask_ablation){reference-type="ref" reference="tab:mask_ablation"}. In the table, [Mask]{.smallcaps} means that we replace the target token with the `[MASK]` symbol for MLM; [Same]{.smallcaps} means that we keep the target token as is; [Rnd]{.smallcaps} means that we replace the target token with another random token.

The numbers in the left part of the table represent the probabilities of the specific strategies used during MLM pre-training (BERT uses 80%, 10%, 10%). The right part of the paper represents the Dev set results. For the feature-based approach, we concatenate the last 4 layers of BERT as the features, which was shown to be the best approach in Section [5.3](#sec:ner){reference-type="ref" reference="sec:ner"}.

From the table it can be seen that fine-tuning is surprisingly robust to different masking strategies. However, as expected, using only the [Mask]{.smallcaps} strategy was problematic when applying the feature-based approach to NER. Interestingly, using only the [Rnd]{.smallcaps} strategy performs much worse than our strategy as well.

[^1]: https://github.com/tensorflow/tensor2tensor

[^2]: http://nlp.seas.harvard.edu/2018/04/03/attention.html

[^3]: In all cases we set the feed-forward/filter size to be $4H$, i.e., 3072 for the $H=768$ and 4096 for the $H=1024$.

[^4]: We note that in the literature the bidirectional Transformer is often referred to as a "Transformer encoder" while the left-context-only version is referred to as a "Transformer decoder" since it can be used for text generation.

[^5]: The final model achieves 97%-98% accuracy on NSP.

[^6]: The vector $C$ is not a meaningful sentence representation without fine-tuning, since it was trained with NSP.

[^7]: For example, the BERT SQuAD model can be trained in around 30 minutes on a single Cloud TPU to achieve a Dev F1 score of 91.0%.

[^8]: The GLUE data set distribution does not include the Test labels, and we only made a single GLUE evaluation server submission for each of BERT$_{\small \textsc{BASE}}$ and BERT$_{\small \textsc{LARGE}}$.

[^9]: https://gluebenchmark.com/leaderboard

[^10]: QANet is described in , but the system has improved substantially after publication.

[^11]: The TriviaQA data we used consists of paragraphs from TriviaQA-Wiki formed of the first 400 tokens in documents, that contain at least one of the provided possible answers.

[^12]: https://cloudplatform.googleblog.com/2018/06/Cloud-TPU-now-offers-preemptible-pricing-and-global-availability.html

[^13]: Note that we only report single-task fine-tuning results in this paper. A multitask fine-tuning approach could potentially push the performance even further. For example, we did observe substantial improvements on RTE from multi-task training with MNLI.

[^14]: <https://gluebenchmark.com/faq>
