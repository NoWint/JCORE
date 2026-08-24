# Introduction

[]{#sec:intro label="sec:intro"}

Image synthesis is one of the computer vision fields with the most spectacular recent development, but also among those with the greatest computational demands. Especially high-resolution synthesis of complex, natural scenes is presently dominated by scaling up likelihood-based models, potentially containing billions of parameters in autoregressive (AR) transformers [@DBLP:journals/corr/abs-2102-12092; @DBLP:conf/nips/RazaviOV19]. In contrast, the promising results of GANs [@goodfellow2014GAN; @bigganbrock; @karras2019stylebased] have been revealed to be mostly confined to data with comparably limited variability as their adversarial learning procedure does not easily scale to modeling complex, multi-modal distributions. Recently, diffusion models [@DBLP:journals/corr/Sohl-DicksteinW15], which are built from a hierarchy of denoising autoencoders, have shown to achieve impressive results in image synthesis [@DBLP:conf/nips/HoJA20; @DBLP:journals/corr/abs-2011-13456] and beyond [@DBLP:journals/corr/abs-2107-00630; @DBLP:conf/iclr/ChenZZWNC21; @DBLP:conf/iclr/KongPHZC21; @DBLP:journals/corr/abs-2103-16091], and define the state-of-the-art in class-conditional image synthesis [@DBLP:journals/corr/abs-2105-05233; @DBLP:journals/corr/abs-2106-15282] and super-resolution [@DBLP:journals/corr/abs-2104-07636]. Moreover, even unconditional DMs can readily be applied to tasks such as inpainting and colorization [@DBLP:journals/corr/abs-2011-13456] or stroke-based synthesis [@DBLP:journals/corr/abs-2108-01073], in contrast to other types of generative models [@VAE; @VAE2; @DBLP:conf/iclr/DinhSB17]. Being likelihood-based models, they do not exhibit mode-collapse and training instabilities as GANs and, by heavily exploiting parameter sharing, they can model highly complex distributions of natural images without involving billions of parameters as in AR models [@DBLP:conf/nips/RazaviOV19].

#### Democratizing High-Resolution Image Synthesis

DMs belong to the class of likelihood-based models, whose mode-covering behavior makes them prone to spend excessive amounts of capacity (and thus compute resources) on modeling imperceptible details of the data [@dieleman2020typicality; @DBLP:journals/corr/SalimansKCK17]. Although the reweighted variational objective [@DBLP:conf/nips/HoJA20] aims to address this by undersampling the initial denoising steps, DMs are still computationally demanding, since training and evaluating such a model requires repeated function evaluations (and gradient computations) in the high-dimensional space of RGB images. As an example, training the most powerful DMs often takes hundreds of GPU days ( - 1000 V100 days in [@DBLP:journals/corr/abs-2105-05233]) and repeated evaluations on a noisy version of the input space render also inference expensive, so that producing 50k samples takes approximately 5 days [@DBLP:journals/corr/abs-2105-05233] on a single A100 GPU. This has two consequences for the research community and users in general: Firstly, training such a model requires massive computational resources only available to a small fraction of the field, and leaves a huge carbon footprint [@DBLP:journals/corr/abs-2104-10350; @DBLP:conf/aaai/StrubellGM20]. Secondly, evaluating an already trained model is also expensive in time and memory, since the same model architecture must run sequentially for a large number of steps ( - 1000 steps in [@DBLP:journals/corr/abs-2105-05233]).

To increase the accessibility of this powerful model class and at the same time reduce its significant resource consumption, a method is needed that reduces the computational complexity for both training and sampling. Reducing the computational demands of DMs without impairing their performance is, therefore, key to enhance their accessibility.

#### Departure to Latent Space

Our approach starts with the analysis of already trained diffusion models in pixel space: Fig. [2](#fig:perceptualcompression){reference-type="ref" reference="fig:perceptualcompression"} shows the rate-distortion trade-off of a trained model. As with any likelihood-based model, learning can be roughly divided into two stages: First is a *perceptual compression* stage which removes high-frequency details but still learns little semantic variation. In the second stage, the actual generative model learns the semantic and conceptual composition of the data (*semantic compression*). We thus aim to first find a *perceptually equivalent, but computationally more suitable space*, in which we will train diffusion models for high-resolution image synthesis.

Following common practice [@DBLP:conf/nips/OordVK17; @DBLP:conf/nips/RazaviOV19; @DBLP:journals/corr/abs-2012-09841; @DBLP:conf/iclr/DaiW19; @DBLP:journals/corr/abs-2102-12092], we separate training into two distinct phases: First, we train an autoencoder which provides a lower-dimensional (and thereby efficient) representational space which is perceptually equivalent to the data space. Importantly, and in contrast to previous work [@DBLP:journals/corr/abs-2012-09841; @DBLP:journals/corr/abs-2102-12092], we do not need to rely on excessive spatial compression, as we train DMs in the learned latent space, which exhibits better scaling properties with respect to the spatial dimensionality. The reduced complexity also provides efficient image generation from the latent space with a single network pass. We dub the resulting model class *Latent Diffusion Models* (LDMs).

A notable advantage of this approach is that we need to train the universal autoencoding stage only once and can therefore reuse it for multiple DM trainings or to explore possibly completely different tasks [@clipguiding]. This enables efficient exploration of a large number of diffusion models for various image-to-image and text-to-image tasks. For the latter, we design an architecture that connects transformers to the DM's UNet backbone [@DBLP:conf/miccai/RonnebergerFB15] and enables arbitrary types of token-based conditioning mechanisms, see Sec. [3.3](#subsec:conditioning){reference-type="ref" reference="subsec:conditioning"}.

In sum, our work makes the following **contributions**:

\(i\) In contrast to purely transformer-based approaches [@DBLP:journals/corr/abs-2012-09841; @DBLP:journals/corr/abs-2102-12092], our method scales more graceful to higher dimensional data and can thus (a) work on a compression level which provides more faithful and detailed reconstructions than previous work (see Fig. [1](#fig:firststagecomparison){reference-type="ref" reference="fig:firststagecomparison"}) and (b) can be efficiently applied to high-resolution synthesis of megapixel images.

\(ii\) We achieve competitive performance on multiple tasks (unconditional image synthesis, inpainting, stochastic super-resolution) and datasets while significantly lowering computational costs. Compared to pixel-based diffusion approaches, we also significantly decrease inference costs.

\(iii\) We show that, in contrast to previous work [@DBLP:journals/corr/abs-2106-05931] which learns both an encoder/decoder architecture and a score-based prior simultaneously, our approach does not require a delicate weighting of reconstruction and generative abilities. This ensures extremely faithful reconstructions and requires very little regularization of the latent space.

\(iv\) We find that for densely conditioned tasks such as super-resolution, inpainting and semantic synthesis, our model can be applied in a convolutional fashion and render large, consistent images of $\sim 1024^2$ px.

\(v\) Moreover, we design a general-purpose conditioning mechanism based on cross-attention, enabling multi-modal training. We use it to train class-conditional, text-to-image and layout-to-image models.

\(vi\) Finally, we release pretrained latent diffusion and autoencoding models at <https://github.com/CompVis/latent-diffusion> which might be reusable for a various tasks besides training of DMs [@clipguiding].

# Related Work

**Generative Models for Image Synthesis** The high dimensional nature of images presents distinct challenges to generative modeling. Generative Adversarial Networks (GAN) [@goodfellow2014GAN] allow for efficient sampling of high resolution images with good perceptual quality [@bigganbrock; @DBLP:journals/corr/abs-1912-04958], but are difficult to optimize [@DBLP:journals/corr/abs-1801-04406; @arjovsky2017wasserstein; @gulrajani2017improved] and struggle to capture the full data distribution [@DBLP:conf/iclr/MetzPPS17]. In contrast, likelihood-based methods emphasize good density estimation which renders optimization more well-behaved. Variational autoencoders (VAE) [@VAE] and flow-based models [@dinh2015nice; @DBLP:conf/iclr/DinhSB17] enable efficient synthesis of high resolution images [@DBLP:journals/corr/abs-2011-10650; @DBLP:conf/nips/VahdatK20; @glow], but sample quality is not on par with GANs. While autoregressive models (ARM) [@DBLP:journals/corr/OordKK16; @NIPS2016_b1301141; @DBLP:conf/icml/ChenRC0JLS20; @DBLP:journals/corr/abs-1904-10509] achieve strong performance in density estimation, computationally demanding architectures [@DBLP:conf/nips/VaswaniSPUJGKP17] and a sequential sampling process limit them to low resolution images. Because pixel based representations of images contain barely perceptible, high-frequency details [@dieleman2020typicality; @DBLP:journals/corr/SalimansKCK17], maximum-likelihood training spends a disproportionate amount of capacity on modeling them, resulting in long training times. To scale to higher resolutions, several two-stage approaches [@DBLP:journals/corr/abs-2104-10157; @DBLP:conf/nips/RazaviOV19; @DBLP:journals/corr/abs-2012-09841; @yu2021vectorquantized] use ARMs to model a compressed latent image space instead of raw pixels.

Recently, **Diffusion Probabilistic Models** (DM) [@DBLP:journals/corr/Sohl-DicksteinW15], have achieved state-of-the-art results in density estimation [@DBLP:journals/corr/abs-2107-00630] as well as in sample quality [@DBLP:journals/corr/abs-2105-05233]. The generative power of these models stems from a natural fit to the inductive biases of image-like data when their underlying neural backbone is implemented as a UNet [@DBLP:conf/miccai/RonnebergerFB15; @DBLP:conf/nips/HoJA20; @DBLP:journals/corr/abs-2011-13456; @DBLP:journals/corr/abs-2105-05233]. The best synthesis quality is usually achieved when a reweighted objective [@DBLP:conf/nips/HoJA20] is used for training. In this case, the DM corresponds to a lossy compressor and allow to trade image quality for compression capabilities. Evaluating and optimizing these models in pixel space, however, has the downside of low inference speed and very high training costs. While the former can be partially adressed by advanced sampling strategies [@DBLP:conf/iclr/SongME21; @DBLP:journals/corr/abs-2104-02600; @DBLP:journals/corr/abs-2106-00132] and hierarchical approaches [@DBLP:journals/corr/abs-2106-15282; @DBLP:journals/corr/abs-2106-05931], training on high-resolution image data always requires to calculate expensive gradients. We adress both drawbacks with our proposed *LDMs*, which work on a compressed latent space of lower dimensionality. This renders training computationally cheaper and speeds up inference with almost no reduction in synthesis quality (see Fig. [1](#fig:firststagecomparison){reference-type="ref" reference="fig:firststagecomparison"}).

**Two-Stage Image Synthesis** To mitigate the shortcomings of individual generative approaches, a lot of research [@DBLP:conf/iclr/DaiW19; @DBLP:conf/nips/RombachEO20; @DBLP:journals/corr/abs-2012-09841; @yu2021vectorquantized; @DBLP:journals/corr/abs-2104-10157; @DBLP:conf/nips/RazaviOV19] has gone into combining the strengths of different methods into more efficient and performant models via a two stage approach. VQ-VAEs [@DBLP:journals/corr/abs-2104-10157; @DBLP:conf/nips/RazaviOV19] use autoregressive models to learn an expressive prior over a discretized latent space. [@DBLP:journals/corr/abs-2102-12092] extend this approach to text-to-image generation by learning a joint distributation over discretized image and text representations. More generally, [@DBLP:conf/nips/RombachEO20] uses conditionally invertible networks to provide a generic transfer between latent spaces of diverse domains. Different from VQ-VAEs, VQGANs [@DBLP:journals/corr/abs-2012-09841; @yu2021vectorquantized] employ a first stage with an adversarial and perceptual objective to scale autoregressive transformers to larger images. However, the high compression rates required for feasible ARM training, which introduces billions of trainable parameters [@DBLP:journals/corr/abs-2102-12092; @DBLP:journals/corr/abs-2012-09841], limit the overall performance of such approaches and less compression comes at the price of high computational cost [@DBLP:journals/corr/abs-2102-12092; @DBLP:journals/corr/abs-2012-09841]. Our work prevents such trade-offs, as our proposed *LDMs* scale more gently to higher dimensional latent spaces due to their convolutional backbone. Thus, we are free to choose the level of compression which optimally mediates between learning a powerful first stage, without leaving too much perceptual compression up to the generative diffusion model while guaranteeing high-fidelity reconstructions (see Fig. [1](#fig:firststagecomparison){reference-type="ref" reference="fig:firststagecomparison"}).

While approaches to jointly [@DBLP:journals/corr/abs-2106-05931] or separately [@DBLP:journals/corr/abs-2106-06819] learn an encoding/decoding model together with a score-based prior exist, the former still require a difficult weighting between reconstruction and generative capabilities [@DBLP:conf/iclr/DaiW19] and are outperformed by our approach (Sec. [4](#sec:experiments){reference-type="ref" reference="sec:experiments"}), and the latter focus on highly structured images such as human faces.

# Method

[]{#sec:method label="sec:method"} To lower the computational demands of training diffusion models towards high-resolution image synthesis, we observe that although diffusion models allow to ignore perceptually irrelevant details by undersampling the corresponding loss terms [@DBLP:conf/nips/HoJA20], they still require costly function evaluations in pixel space, which causes huge demands in computation time and energy resources.

We propose to circumvent this drawback by introducing an explicit separation of the compressive from the generative learning phase (see Fig. [2](#fig:perceptualcompression){reference-type="ref" reference="fig:perceptualcompression"}). To achieve this, we utilize an autoencoding model which learns a space that is perceptually equivalent to the image space, but offers significantly reduced computational complexity.

Such an approach offers several advantages: (i) By leaving the high-dimensional image space, we obtain DMs which are computationally much more efficient because sampling is performed on a low-dimensional space. (ii) We exploit the inductive bias of DMs inherited from their UNet architecture [@DBLP:conf/miccai/RonnebergerFB15], which makes them particularly effective for data with spatial structure and therefore alleviates the need for aggressive, quality-reducing compression levels as required by previous approaches [@DBLP:journals/corr/abs-2012-09841; @DBLP:journals/corr/abs-2102-12092]. (iii) Finally, we obtain general-purpose compression models whose latent space can be used to train multiple generative models and which can also be utilized for other downstream applications such as single-image CLIP-guided synthesis [@Frans2021CLIPDrawET].

## Perceptual Image Compression

[]{#subsec:stageone label="subsec:stageone"} Our perceptual compression model is based on previous work [@DBLP:journals/corr/abs-2012-09841] and consists of an autoencoder trained by combination of a perceptual loss [@lpips] and a patch-based [@DBLP:conf/cvpr/IsolaZZE17] adversarial objective [@dosovitskiy201perceptual; @DBLP:journals/corr/abs-2012-09841; @yu2021vectorquantized]. This ensures that the reconstructions are confined to the image manifold by enforcing local realism and avoids bluriness introduced by relying solely on pixel-space losses such as $L_2$ or $L_1$ objectives.

More precisely, given an image $x \in \mathbb{R}^{H\times W\times 3}$ in RGB space, the encoder $\mathcal{E}$ encodes $x$ into a latent representation $z=\mathcal{E}(x)$, and the decoder $\mathcal{D}$ reconstructs the image from the latent, giving $\tilde{x}= \mathcal{D}(z) = \mathcal{D}(\mathcal{E}(x))$, where $z \in \mathbb{R}^{h\times w\times c}$. Importantly, the encoder *downsamples* the image by a factor $f = H/h = W/w$, and we investigate different downsampling factors $f = 2^m$, with $m \in \mathbb{N}$.

In order to avoid arbitrarily high-variance latent spaces, we experiment with two different kinds of regularizations. The first variant, *KL-reg.*, imposes a slight KL-penalty towards a standard normal on the learned latent, similar to a VAE [@VAE; @VAE2], whereas *VQ-reg.* uses a vector quantization layer [@DBLP:conf/nips/OordVK17] within the decoder. This model can be interpreted as a VQGAN [@DBLP:journals/corr/abs-2012-09841] but with the quantization layer absorbed by the decoder. Because our subsequent DM is designed to work with the two-dimensional structure of our learned latent space $z=\mathcal{E}(x)$, we can use relatively mild compression rates and achieve very good reconstructions. This is in contrast to previous works [@DBLP:journals/corr/abs-2012-09841; @DBLP:journals/corr/abs-2102-12092], which relied on an arbitrary 1D ordering of the learned space $z$ to model its distribution autoregressively and thereby ignored much of the inherent structure of $z$. Hence, our compression model preserves details of $x$ better (see Tab. [9](#tab:firststagetablecomplete){reference-type="ref" reference="tab:firststagetablecomplete"}). The full objective and training details can be found in the supplement.

## Latent Diffusion Models {#subsec:stagetwo}

**Diffusion Models** [@DBLP:journals/corr/Sohl-DicksteinW15] are probabilistic models designed to learn a data distribution $p(x)$ by gradually denoising a normally distributed variable, which corresponds to learning the reverse process of a fixed Markov Chain of length $T$. For image synthesis, the most successful models [@DBLP:conf/nips/HoJA20; @DBLP:journals/corr/abs-2105-05233; @DBLP:journals/corr/abs-2104-07636] rely on a reweighted variant of the variational lower bound on $p(x)$, which mirrors denoising score-matching [@DBLP:journals/corr/abs-2011-13456]. These models can be interpreted as an equally weighted sequence of denoising autoencoders $\epsilon_\theta(x_{t},t);\, t=1\dots T$, which are trained to predict a denoised variant of their input $x_t$, where $x_t$ is a noisy version of the input $x$. The corresponding objective can be simplified to (Sec. [8](#suppsec:dmdetails){reference-type="ref" reference="suppsec:dmdetails"}) $$\begin{equation}
L_{DM}= \mathbb{E}_{x, \epsilon \sim \mathcal{N}(0, 1),  t }\Big[ \Vert \epsilon - \epsilon_\theta(x_{t},t) \Vert_{2}^{2}\Big] \, ,
\label{eq:dmloss}
\end{equation}$$ with $t$ uniformly sampled from $\{1, \dots, T\}$.

**Generative Modeling of Latent Representations** With our trained perceptual compression models consisting of $\mathcal{E}$ and $\mathcal{D}$, we now have access to an efficient, low-dimensional latent space in which high-frequency, imperceptible details are abstracted away. Compared to the high-dimensional pixel space, this space is more suitable for likelihood-based generative models, as they can now (i) focus on the important, semantic bits of the data and (ii) train in a lower dimensional, computationally much more efficient space.

Unlike previous work that relied on autoregressive, attention-based transformer models in a highly compressed, discrete latent space [@DBLP:journals/corr/abs-2102-12092; @DBLP:journals/corr/abs-2012-09841; @yu2021vectorquantized], we can take advantage of image-specific inductive biases that our model offers. This includes the ability to build the underlying UNet primarily from 2D convolutional layers, and further focusing the objective on the perceptually most relevant bits using the reweighted bound, which now reads

$$\begin{equation}
L_{LDM}:= \mathbb{E}_{\mathcal{E}(x), \epsilon \sim \mathcal{N}(0, 1),  t}\Big[ \Vert \epsilon - \epsilon_\theta(z_{t},t) \Vert_{2}^{2}\Big] \, .
\label{eq:ldmloss}
\end{equation}$$ The neural backbone $\epsilon_\theta(\circ, t)$ of our model is realized as a time-conditional UNet [@DBLP:conf/miccai/RonnebergerFB15]. Since the forward process is fixed, $z_{t}$ can be efficiently obtained from $\mathcal{E}$ during training, and samples from $p(z$) can be decoded to image space with a single pass through $\mathcal{D}$.

## Conditioning Mechanisms {#subsec:conditioning}

Similar to other types of generative models [@DBLP:journals/corr/MirzaO14; @NIPS2015_8d55a249], diffusion models are in principle capable of modeling conditional distributions of the form $p(z \vert y)$. This can be implemented with a conditional denoising autoencoder $\epsilon_\theta(z_{t},t,y)$ and paves the way to controlling the synthesis process through inputs $y$ such as text [@Reed2016GenerativeAT], semantic maps  [@spade; @DBLP:conf/cvpr/IsolaZZE17] or other image-to-image translation tasks [@Isola2017ImagetoImageTW].

In the context of image synthesis, however, combining the generative power of DMs with other types of conditionings beyond class-labels [@DBLP:journals/corr/abs-2105-05233] or blurred variants of the input image [@DBLP:journals/corr/abs-2104-07636] is so far an under-explored area of research.

We turn DMs into more flexible conditional image generators by augmenting their underlying UNet backbone with the cross-attention mechanism [@DBLP:conf/nips/VaswaniSPUJGKP17], which is effective for learning attention-based models of various input modalities [@DBLP:conf/icml/JaegleGBVZC21; @DBLP:journals/corr/abs-2107-14795]. To pre-process $y$ from various modalities (such as language prompts) we introduce a domain specific encoder $\tau_\theta$ that projects $y$ to an intermediate representation $\tau_\theta(y) \in \mathbb{R}^{M\times d_\tau}$, which is then mapped to the intermediate layers of the UNet via a cross-attention layer implementing $\text{Attention}(Q, K, V) = \text{softmax}\left(\frac{QK^T}{\sqrt{d}}\right) \cdot V$, with $$\begin{equation*}
Q = W^{(i)}_Q \cdot  \varphi_i(z_t), \; K = W^{(i)}_K \cdot \tau_\theta(y),
  \; V = W^{(i)}_V \cdot \tau_\theta(y) . \nonumber
%
\end{equation*}$$ Here, $\varphi_i(z_t) \in \mathbb{R}^{N \times d^i_\epsilon}$ denotes a (flattened) intermediate representation of the UNet implementing $\epsilon_\theta$ and $W^{(i)}_V \in \mathbb{R}^{d \times d^i_\epsilon}$, $W^{(i)}_Q \in \mathbb{R}^{d \times d_\tau}$ & $W^{(i)}_K \in \mathbb{R}^{d \times d_\tau}$ are learnable projection matrices [@DBLP:conf/nips/VaswaniSPUJGKP17; @DBLP:conf/icml/JaegleGBVZC21]. See Fig. [3](#fig:conditioning){reference-type="ref" reference="fig:conditioning"} for a visual depiction.

Based on image-conditioning pairs, we then learn the conditional LDM via $$\begin{equation}
L_{LDM}:= \mathbb{E}_{\mathcal{E}(x), y, \epsilon \sim \mathcal{N}(0, 1), t }\Big[ \Vert \epsilon - \epsilon_\theta(z_{t},t, \tau_\theta(y)) \Vert_{2}^{2}\Big] \, ,
\label{eq:cond_loss}
\end{equation}$$ where both $\tau_\theta$ and $\epsilon_\theta$ are jointly optimized via Eq. [\[eq:cond_loss\]](#eq:cond_loss){reference-type="ref" reference="eq:cond_loss"}. This conditioning mechanism is flexible as $\tau_\theta$ can be parameterized with domain-specific experts, (unmasked) transformers [@DBLP:conf/nips/VaswaniSPUJGKP17] when $y$ are text prompts (see Sec. [4.3.1](#subsubsec:crossattn2img){reference-type="ref" reference="subsubsec:crossattn2img"})

# Experiments {#sec:experiments}

<figcaption><span id="fig:cin_traincourse" data-label="fig:cin_traincourse"></span>Analyzing the training of class-conditional <em>LDMs</em> with different downsampling factors <span class="math inline"><em>f</em></span> over 2M train steps on the ImageNet dataset. Pixel-based <em>LDM-1</em> requires substantially larger train times compared to models with larger downsampling factors (<em>LDM-<span class="math inline">{</span>4-16<span class="math inline">}</span></em>). Too much perceptual compression as in <em>LDM-32</em> limits the overall sample quality. All models are trained on a single NVIDIA A100 with the same computational budget. Results obtained with 100 DDIM steps <span class="citation" data-cites="DBLP:conf/iclr/SongME21"></span> and <span class="math inline"><em>κ</em> = 0</span>. </figcaption>
</figure>

<figcaption><span id="fig:speedplot" data-label="fig:speedplot"></span> Comparing <em>LDMs</em> with varying compression on the CelebA-HQ (left) and ImageNet (right) datasets. Different markers indicate <span class="math inline">{10, 20, 50, 100, 200}</span> sampling steps using DDIM, from right to left along each line. The dashed line shows the FID scores for 200 steps, indicating the strong performance of <em>LDM-<span class="math inline">{</span>4-8<span class="math inline">}</span></em>. FID scores assessed on 5000 samples. All models were trained for 500k (CelebA) / 2M (ImageNet) steps on an A100. </figcaption>
</figure>

*LDMs* provide means to flexible and computationally tractable diffusion based image synthesis of various image modalities, which we empirically show in the following. Firstly, however, we analyze the gains of our models compared to pixel-based diffusion models in both training and inference. Interestingly, we find that *LDMs* trained in *VQ*-regularized latent spaces sometimes achieve better sample quality, even though the reconstruction capabilities of *VQ*-regularized first stage models slightly fall behind those of their continuous counterparts, Tab. [9](#tab:firststagetablecomplete){reference-type="ref" reference="tab:firststagetablecomplete"}. A visual comparison between the effects of first stage regularization schemes on *LDM* training and their generalization abilities to resolutions $>256^2$ can be found in Appendix [10.1](#suppsec:rescale){reference-type="ref" reference="suppsec:rescale"}. In [11.2](#suppsec:implementation_details){reference-type="ref" reference="suppsec:implementation_details"} we list details on architecture, implementation, training and evaluation for all results presented in this section.

## On Perceptual Compression Tradeoffs {#subsec:reduced_compute}

This section analyzes the behavior of our LDMs with different downsampling factors $f\in\{1,2,4,8,16,32\}$ (abbreviated as *LDM-*$f$, where *LDM-1* corresponds to pixel-based DMs). To obtain a comparable test-field, we fix the computational resources to a single NVIDIA A100 for all experiments in this section and train all models for the same number of steps and with the same number of parameters.

Tab. [9](#tab:firststagetablecomplete){reference-type="ref" reference="tab:firststagetablecomplete"} shows hyperparameters and reconstruction performance of the first stage models used for the *LDMs* compared in this section. Fig. [6](#fig:cin_traincourse){reference-type="ref" reference="fig:cin_traincourse"} shows sample quality as a function of training progress for 2M steps of class-conditional models on the ImageNet [@DBLP:conf/cvpr/DengDSLL009] dataset. We see that, i) small downsampling factors for *LDM-*$\{$*1,2*$\}$ result in slow training progress, whereas ii) overly large values of $f$ cause stagnating fidelity after comparably few training steps. Revisiting the analysis above (Fig. [1](#fig:firststagecomparison){reference-type="ref" reference="fig:firststagecomparison"} and [2](#fig:perceptualcompression){reference-type="ref" reference="fig:perceptualcompression"}) we attribute this to i) leaving most of perceptual compression to the diffusion model and ii) too strong first stage compression resulting in information loss and thus limiting the achievable quality. *LDM-$\{$`<!-- -->`{=html}4-16$\}$* strike a good balance between efficiency and perceptually faithful results, which manifests in a significant FID [@FID] gap of 38 between pixel-based diffusion (*LDM-1*) and *LDM-8* after 2M training steps.

In Fig. [7](#fig:speedplot){reference-type="ref" reference="fig:speedplot"}, we compare models trained on CelebA-HQ [@DBLP:journals/corr/abs-1710-10196] and ImageNet in terms sampling speed for different numbers of denoising steps with the DDIM sampler [@DBLP:conf/iclr/SongME21] and plot it against FID-scores [@FID]. *LDM-$\{$`<!-- -->`{=html}4-8$\}$* outperform models with unsuitable ratios of perceptual and conceptual compression. Especially compared to pixel-based *LDM-1*, they achieve much lower FID scores while simultaneously significantly increasing sample throughput. Complex datasets such as ImageNet require reduced compression rates to avoid reducing quality. In summary, *LDM-4* and *-8* offer the best conditions for achieving high-quality synthesis results.

::::: footnotesize
::: adjustbox
max width=

+-------------------------------------------------------------------------------------------------------------------+---+-----------------------------------------------------------------------------------------------------------------+
| CelebA-HQ $256\times 256$                                                                                         |   | FFHQ $256\times 256$                                                                                            |
+:=====================================================:+:==================:+:================:+:=================:+:=:+:================================================:+:==================:+:==================:+:==================:+
| 1-4 **Method**                                        | FID $\downarrow$   | Prec. $\uparrow$ | Recall $\uparrow$ |   | **Method**                                       | FID $\downarrow$   | Prec. $\uparrow$   | Recall $\uparrow$  |
+-------------------------------------------------------+--------------------+------------------+-------------------+---+--------------------------------------------------+--------------------+--------------------+--------------------+
| 1-4 DC-VAE [@DBLP:conf/cvpr/ParmarLLT21]              | 15.8               | \-               | \-                |   | ImageBART [@DBLP:journals/corr/abs-2108-08827]   | 9.57               | \-                 | \-                 |
+-------------------------------------------------------+--------------------+------------------+-------------------+---+--------------------------------------------------+--------------------+--------------------+--------------------+
| VQGAN+T. [@DBLP:journals/corr/abs-2012-09841] (k=400) | 10.2               | \-               | \-                |   | U-Net GAN (+aug) [@DBLP:conf/cvpr/SchonfeldSK20] | 10.9 (7.6)         | \-                 | \-                 |
+-------------------------------------------------------+--------------------+------------------+-------------------+---+--------------------------------------------------+--------------------+--------------------+--------------------+
| PGGAN [@DBLP:journals/corr/abs-1710-10196]            | 8.0                | \-               | \-                |   | UDM [@DBLP:journals/corr/abs-2106-05527]         | 5.54               | \-                 | \-                 |
+-------------------------------------------------------+--------------------+------------------+-------------------+---+--------------------------------------------------+--------------------+--------------------+--------------------+
| LSGM [@DBLP:journals/corr/abs-2106-05931]             | 7.22               | \-               | \-                |   | StyleGAN [@stylegan]                             | [4.16]{.underline} | [0.71]{.underline} | [0.46]{.underline} |
+-------------------------------------------------------+--------------------+------------------+-------------------+---+--------------------------------------------------+--------------------+--------------------+--------------------+
| UDM [@DBLP:journals/corr/abs-2106-05527]              | [7.16]{.underline} | \-               | \-                |   | ProjectedGAN[@DBLP:journals/corr/abs-2111-01007] | **3.08**           | 0.65               | [0.46]{.underline} |
+-------------------------------------------------------+--------------------+------------------+-------------------+---+--------------------------------------------------+--------------------+--------------------+--------------------+
| *LDM-4* (ours, 500-s$^\dagger$)                       | **5.11**           | 0.72             | 0.49              |   | *LDM-4* (ours, 200-s)                            | 4.98               | **0.73**           | **0.50**           |
+-------------------------------------------------------+--------------------+------------------+-------------------+---+--------------------------------------------------+--------------------+--------------------+--------------------+

: Evaluation metrics for unconditional image synthesis. CelebA-HQ results reproduced from [@DBLP:conf/cvpr/ParmarLLT21; @DBLP:conf/iclr/XiaoKKV21; @DBLP:journals/corr/abs-2106-05527], FFHQ from [@DBLP:journals/corr/abs-1912-04958; @DBLP:journals/corr/abs-2106-05527]. $^\dagger$: $N$-s refers to $N$ sampling steps with the DDIM [@DBLP:conf/iclr/SongME21] sampler. $^*$: trained in *KL*-regularized latent space. Additional results can be found in the supplementary. {#tab:fids}
:::

::: adjustbox
max width=

+-----------------------------------------------------------------------------------------------------------------+---+-----------------------------------------------------------------------------------------------------------------+
| LSUN-Churches $256\times 256$                                                                                   |   | LSUN-Bedrooms $256\times 256$                                                                                   |
+:================================================:+:==================:+:==================:+:==================:+:=:+:================================================:+:==================:+:==================:+:==================:+
| 1-4 **Method**                                   | FID $\downarrow$   | Prec. $\uparrow$   | Recall $\uparrow$  |   | **Method**                                       | FID $\downarrow$   | Prec. $\uparrow$   | Recall $\uparrow$  |
+--------------------------------------------------+--------------------+--------------------+--------------------+---+--------------------------------------------------+--------------------+--------------------+--------------------+
| 1-4 DDPM [@DBLP:conf/nips/HoJA20]                | 7.89               | \-                 | \-                 |   | ImageBART [@DBLP:journals/corr/abs-2108-08827]   | 5.51               | \-                 | \-                 |
+--------------------------------------------------+--------------------+--------------------+--------------------+---+--------------------------------------------------+--------------------+--------------------+--------------------+
| ImageBART[@DBLP:journals/corr/abs-2108-08827]    | 7.32               | \-                 | \-                 |   | DDPM [@DBLP:conf/nips/HoJA20]                    | 4.9                | \-                 | \-                 |
+--------------------------------------------------+--------------------+--------------------+--------------------+---+--------------------------------------------------+--------------------+--------------------+--------------------+
| PGGAN [@DBLP:journals/corr/abs-1710-10196]       | 6.42               | \-                 | \-                 |   | UDM [@DBLP:journals/corr/abs-2106-05527]         | 4.57               | \-                 | \-                 |
+--------------------------------------------------+--------------------+--------------------+--------------------+---+--------------------------------------------------+--------------------+--------------------+--------------------+
| StyleGAN[@stylegan]                              | 4.21               | \-                 | \-                 |   | StyleGAN[@stylegan]                              | 2.35               | 0.59               | [0.48]{.underline} |
+--------------------------------------------------+--------------------+--------------------+--------------------+---+--------------------------------------------------+--------------------+--------------------+--------------------+
| StyleGAN2[@DBLP:journals/corr/abs-1912-04958]    | [3.86]{.underline} | \-                 | \-                 |   | ADM [@DBLP:journals/corr/abs-2105-05233]         | [1.90]{.underline} | **0.66**           | **0.51**           |
+--------------------------------------------------+--------------------+--------------------+--------------------+---+--------------------------------------------------+--------------------+--------------------+--------------------+
| ProjectedGAN[@DBLP:journals/corr/abs-2111-01007] | **1.59**           | [0.61]{.underline} | [0.44]{.underline} |   | ProjectedGAN[@DBLP:journals/corr/abs-2111-01007] | **1.52**           | [0.61]{.underline} | 0.34               |
+--------------------------------------------------+--------------------+--------------------+--------------------+---+--------------------------------------------------+--------------------+--------------------+--------------------+
| *LDM-8*$^*$ (ours, 200-s)                        | 4.02               | **0.64**           | **0.52**           |   | *LDM-4* (ours, 200-s)                            | 2.95               | **0.66**           | [0.48]{.underline} |
+--------------------------------------------------+--------------------+--------------------+--------------------+---+--------------------------------------------------+--------------------+--------------------+--------------------+

: Evaluation metrics for unconditional image synthesis. CelebA-HQ results reproduced from [@DBLP:conf/cvpr/ParmarLLT21; @DBLP:conf/iclr/XiaoKKV21; @DBLP:journals/corr/abs-2106-05527], FFHQ from [@DBLP:journals/corr/abs-1912-04958; @DBLP:journals/corr/abs-2106-05527]. $^\dagger$: $N$-s refers to $N$ sampling steps with the DDIM [@DBLP:conf/iclr/SongME21] sampler. $^*$: trained in *KL*-regularized latent space. Additional results can be found in the supplementary. {#tab:fids}
:::
:::::

::::: center
:::: footnotesize
::: adjustbox
max width=

+---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| **Text-Conditional Image Synthesis**                                                                                                                                                  |
+:=========================================================+:===================:+:=========================:+:===================:+:==================================================:+
| **Method**                                               | FID $\downarrow$    | IS$\uparrow$              | $N_{\text{params}}$ |                                                    |
+----------------------------------------------------------+---------------------+---------------------------+---------------------+----------------------------------------------------+
| CogView$^{\dagger}$ [@DBLP:journals/corr/abs-2105-13290] | 27.10               | 18.20                     | 4B                  | self-ranking, rejection rate 0.017                 |
+----------------------------------------------------------+---------------------+---------------------------+---------------------+----------------------------------------------------+
| LAFITE$^{\dagger}$ [@DBLP:journals/corr/abs-2111-13792]  | 26.94               | [26.02]{.underline}       | 75M                 |                                                    |
+----------------------------------------------------------+---------------------+---------------------------+---------------------+----------------------------------------------------+
| GLIDE$^*$ [@DBLP:journals/corr/abs-2112-10741]           | [12.24]{.underline} | \-                        | 6B                  | 277 DDIM steps, c.f.g. [@ho2021classifier] $s=3$   |
+----------------------------------------------------------+---------------------+---------------------------+---------------------+----------------------------------------------------+
| Make-A-Scene$^*$ [@DBLP:journals/corr/abs-2203-13131]    | **11.84**           | \-                        | 4B                  | c.f.g for AR models [@ar_cfg] $s=5$                |
+----------------------------------------------------------+---------------------+---------------------------+---------------------+----------------------------------------------------+
| *LDM-KL-8*                                               | 23.31               | 20.03$\pm\text{0.33}$     | 1.45B               | 250 DDIM steps                                     |
+----------------------------------------------------------+---------------------+---------------------------+---------------------+----------------------------------------------------+
| *LDM-KL-8-G*$^*$                                         | 12.63               | **30.29$\pm\text{0.42}$** | 1.45B               | 250 DDIM steps, c.f.g. [@ho2021classifier] $s=1.5$ |
+----------------------------------------------------------+---------------------+---------------------------+---------------------+----------------------------------------------------+

: Evaluation of text-conditional image synthesis on the $256 \times 256$-sized MS-COCO [@DBLP:journals/corr/LinMBHPRDZ14] dataset: with 250 DDIM [@DBLP:conf/iclr/SongME21] steps our model is on par with the most recent diffusion [@DBLP:journals/corr/abs-2112-10741] and autoregressive [@DBLP:journals/corr/abs-2203-13131] methods despite using significantly less parameters. $^\dagger$/$^*$:Numbers from [@DBLP:journals/corr/abs-2111-13792]/ [@DBLP:journals/corr/abs-2203-13131] {#tab:txt2img}
:::
::::
:::::

## Image Generation with Latent Diffusion {#subsec:uncond2img}

We train unconditional models of $256^2$ images on CelebA-HQ [@DBLP:journals/corr/abs-1710-10196], FFHQ [@stylegan], LSUN-Churches and -Bedrooms [@DBLP:journals/corr/YuZSSX15] and evaluate the i) sample quality and ii) their coverage of the data manifold using ii) FID [@FID] and ii) Precision-and-Recall [@DBLP:journals/corr/abs-1904-06991]. Tab. [2](#tab:fids){reference-type="ref" reference="tab:fids"} summarizes our results. On CelebA-HQ, we report a new state-of-the-art FID of $5.11$, outperforming previous likelihood-based models as well as GANs. We also outperform LSGM [@DBLP:journals/corr/abs-2106-05931] where a latent diffusion model is trained jointly together with the first stage. In contrast, we train diffusion models in a fixed space and avoid the difficulty of weighing reconstruction quality against learning the prior over the latent space, see Fig. [1](#fig:firststagecomparison){reference-type="ref" reference="fig:firststagecomparison"}-[2](#fig:perceptualcompression){reference-type="ref" reference="fig:perceptualcompression"}.

We outperform prior diffusion based approaches on all but the LSUN-Bedrooms dataset, where our score is close to ADM [@DBLP:journals/corr/abs-2105-05233], despite utilizing half its parameters and requiring 4-times less train resources (see Appendix [11.3.5](#suppsubsubsec:compute){reference-type="ref" reference="suppsubsubsec:compute"}). Moreover, *LDMs* consistently improve upon GAN-based methods in Precision and Recall, thus confirming the advantages of their mode-covering likelihood-based training objective over adversarial approaches. In Fig. [4](#fig:samples_mix){reference-type="ref" reference="fig:samples_mix"} we also show qualitative results on each dataset.

## Conditional Latent Diffusion {#subsec:conditionallatentdiffusion}

### Transformer Encoders for LDMs {#subsubsec:crossattn2img}

By introducing cross-attention based conditioning into LDMs we open them up for various conditioning modalities previously unexplored for diffusion models. For **text-to-image** image modeling, we train a 1.45B parameter *KL*-regularized *LDM* conditioned on language prompts on LAION-400M [@schuhmann2021laion400m]. We employ the BERT-tokenizer [@DBLP:journals/corr/abs-1810-04805] and implement $\tau_\theta$ as a transformer [@DBLP:conf/nips/VaswaniSPUJGKP17] to infer a latent code which is mapped into the UNet via (multi-head) cross-attention (Sec. [3.3](#subsec:conditioning){reference-type="ref" reference="subsec:conditioning"}). This combination of domain specific experts for learning a language representation and visual synthesis results in a powerful model, which generalizes well to complex, user-defined text prompts, Fig. [8](#fig:bboxandtxt2img){reference-type="ref" reference="fig:bboxandtxt2img"} and [5](#fig:text2img_samples){reference-type="ref" reference="fig:text2img_samples"}. For quantitative analysis, we follow prior work and evaluate text-to-image generation on the MS-COCO [@DBLP:journals/corr/LinMBHPRDZ14] validation set, where our model improves upon powerful AR [@DBLP:journals/corr/abs-2102-12092; @DBLP:journals/corr/abs-2105-13290] and GAN-based [@DBLP:journals/corr/abs-2111-13792] methods, Tab. [3](#tab:txt2img){reference-type="ref" reference="tab:txt2img"}. We note that applying classifier-free diffusion guidance [@ho2021classifier] greatly boosts sample quality, such that the guided *LDM-KL-8-G* is on par with the recent state-of-the-art AR [@DBLP:journals/corr/abs-2203-13131] and diffusion models [@DBLP:journals/corr/abs-2112-10741] for text-to-image synthesis, while substantially reducing parameter count. To further analyze the flexibility of the cross-attention based conditioning mechanism we also train models to synthesize images based on **semantic layouts** on OpenImages  [@DBLP:journals/corr/abs-1811-00982], and finetune on COCO [@DBLP:conf/cvpr/CaesarUF18], see Fig. [8](#fig:bboxandtxt2img){reference-type="ref" reference="fig:bboxandtxt2img"}. See Sec. [10.3](#suppsec:bboxtoimage){reference-type="ref" reference="suppsec:bboxtoimage"} for the quantitative evaluation and implementation details.

Lastly, following prior work [@DBLP:journals/corr/abs-2105-05233; @bigganbrock; @DBLP:journals/corr/abs-2012-09841; @DBLP:journals/corr/abs-2108-08827], we evaluate our best-performing **class-conditional** ImageNet models with $f\in\{4,8\}$ from Sec. [4.1](#subsec:reduced_compute){reference-type="ref" reference="subsec:reduced_compute"} in Tab. [4](#tab:imagenet_main_numbers){reference-type="ref" reference="tab:imagenet_main_numbers"}, Fig. [4](#fig:samples_mix){reference-type="ref" reference="fig:samples_mix"} and Sec. [10.4](#suppsec:cin){reference-type="ref" reference="suppsec:cin"}. Here we outperform the state of the art diffusion model ADM [@DBLP:journals/corr/abs-2105-05233] while significantly reducing computational requirements and parameter count, Tab [18](#tab:compute_vs_fid){reference-type="ref" reference="tab:compute_vs_fid"}.

:::: footnotesize
::: adjustbox
max width=

  **Method**                                     FID$\downarrow$                IS$\uparrow$              Precision$\uparrow$    Recall$\uparrow$    $N_{\text{params}}$
  -------------------------------------------- -------------------- ------------------------------------ --------------------- -------------------- --------------------- -----------------------------------------------
  BigGan-deep [@bigganbrock]                           6.95          [203.6$\pm\text{2.6}$]{.underline}        **0.87**                0.28                 340M                                \-
  ADM [@DBLP:journals/corr/abs-2105-05233]            10.94                        100.98                        0.69                **0.63**               554M                          250 DDIM steps
  ADM-G [@DBLP:journals/corr/abs-2105-05233]    [4.59]{.underline}                 186.7                  [0.82]{.underline}           0.52                 608M                          250 DDIM steps
  *LDM-4* (ours)                                      10.56                103.49$\pm\text{1.24}$                0.71           [0.62]{.underline}          400M                          250 DDIM steps
  *LDM-4*-G (ours)                                   **3.60**            **247.67$\pm\text{5.59}$**            **0.87**                0.48                 400M           250 steps, c.f.g [@ho2021classifier], $s=1.5$

  : Comparison of a class-conditional ImageNet *LDM* with recent state-of-the-art methods for class-conditional image generation on ImageNet [@DBLP:conf/cvpr/DengDSLL009]. A more detailed comparison with additional baselines can be found in [10.4](#suppsec:cin){reference-type="ref" reference="suppsec:cin"}, Tab. [11](#tab:imagenet_numbers){reference-type="ref" reference="tab:imagenet_numbers"} and [12](#suppsec:compute2){reference-type="ref" reference="suppsec:compute2"}. *c.f.g.* denotes classifier-free guidance with a scale $s$ as proposed in  [@ho2021classifier]. {#tab:imagenet_main_numbers}
:::
::::

### Convolutional Sampling Beyond $256^2$ {#subsubsec:beyond}

By concatenating spatially aligned conditioning information to the input of $\epsilon_\theta$, *LDMs* can serve as efficient general-purpose image-to-image translation models. We use this to train models for semantic synthesis, super-resolution (Sec. [4.4](#subsec:superres){reference-type="ref" reference="subsec:superres"}) and inpainting (Sec. [4.5](#subsec:inpainting){reference-type="ref" reference="subsec:inpainting"}). For semantic synthesis, we use images of landscapes paired with semantic maps [@spade; @DBLP:journals/corr/abs-2012-09841] and concatenate downsampled versions of the semantic maps with the latent image representation of a $f=4$ model (VQ-reg., see Tab. [9](#tab:firststagetablecomplete){reference-type="ref" reference="tab:firststagetablecomplete"}). We train on an input resolution of $256^2$ (crops from $384^2$) but find that our model generalizes to larger resolutions and can generate images up to the megapixel regime when evaluated in a convolutional manner (see Fig. [9](#fig:thicksample){reference-type="ref" reference="fig:thicksample"}). We exploit this behavior to also apply the super-resolution models in Sec. [4.4](#subsec:superres){reference-type="ref" reference="subsec:superres"} and the inpainting models in Sec. [4.5](#subsec:inpainting){reference-type="ref" reference="subsec:inpainting"} to generate large images between $512^2$ and $1024^2$. For this application, the signal-to-noise ratio (induced by the scale of the latent space) significantly affects the results. In Sec. [10.1](#suppsec:rescale){reference-type="ref" reference="suppsec:rescale"} we illustrate this when learning an LDM on (i) the latent space as provided by a $f=4$ model (KL-reg., see Tab. [9](#tab:firststagetablecomplete){reference-type="ref" reference="tab:firststagetablecomplete"}), and (ii) a rescaled version, scaled by the component-wise standard deviation.

The latter, in combination with classifier-free guidance [@ho2021classifier], also enables the direct synthesis of $>256^2$ images for the text-conditional *LDM-KL-8-G* as in Fig. [13](#fig:text2img_conv){reference-type="ref" reference="fig:text2img_conv"}.

## Super-Resolution with Latent Diffusion {#subsec:superres}

LDMs can be efficiently trained for super-resolution by diretly conditioning on low-resolution images via concatenation (Sec. [3.3](#subsec:conditioning){reference-type="ref" reference="subsec:conditioning"}). In a first experiment, we follow SR3 [@DBLP:journals/corr/abs-2104-07636] and fix the image degradation to a bicubic interpolation with $4\times$-downsampling and train on ImageNet following SR3's data processing pipeline. We use the $f=4$ autoencoding model pretrained on OpenImages (VQ-reg., Tab. [9](#tab:firststagetablecomplete){reference-type="ref" reference="tab:firststagetablecomplete"}) and concatenate the low-resolution conditioning $y$ and the inputs to the UNet, $\tau_\theta$ is the identity. Our qualitative and quantitative results (see Fig. [10](#fig:srimagenet){reference-type="ref" reference="fig:srimagenet"} and Tab. [6](#tab:srtable){reference-type="ref" reference="tab:srtable"}) show competitive performance and LDM-SR outperforms SR3 in FID while SR3 has a better IS. A simple image regression model achieves the highest PSNR and SSIM scores; however these metrics do not align well with human perception [@lpips] and favor blurriness over imperfectly aligned high frequency details [@DBLP:journals/corr/abs-2104-07636]. Further, we conduct a user study comparing the pixel-baseline with LDM-SR. We follow SR3 [@DBLP:journals/corr/abs-2104-07636] where human subjects were shown a low-res image in between two high-res images and asked for preference. The results in Tab. [5](#tab:user_study){reference-type="ref" reference="tab:user_study"} affirm the good performance of LDM-SR. PSNR and SSIM can be pushed by using a post-hoc guiding mechanism [@DBLP:journals/corr/abs-2105-05233] and we implement this *image-based guider* via a perceptual loss, see Sec. [10.6](#suppsec:superres){reference-type="ref" reference="suppsec:superres"}.

:::: footnotesize
::: adjustbox
max width=

+---------------------------------------------+-----------------------------+---+---------------------------+
|                                             | SR on ImageNet              |   | Inpainting on Places      |
+:============================================+:===============:+:=========:+:=:+:============:+:==========:+
| 2-3 **User Study**                          | Pixel-DM ($f1$) | *LDM-4*   |   | LAMA [@lama] | *LDM-4*    |
+---------------------------------------------+-----------------+-----------+---+--------------+------------+
| 2-3 **Task 1:** Preference vs GT $\uparrow$ | 16.0%           | **30.4%** |   | 13.6%        | **21.0%**  |
+---------------------------------------------+-----------------+-----------+---+--------------+------------+
| **Task 2:** Preference Score $\uparrow$     | 29.4%           | **70.6%** |   | 31.9%        | **68.1%**  |
+---------------------------------------------+-----------------+-----------+---+--------------+------------+

: Task 1: Subjects were shown ground truth and generated image and asked for preference. Task 2: Subjects had to decide between two generated images. More details in [11.3.6](#suppsubsubsec:user_study){reference-type="ref" reference="suppsubsubsec:user_study"} {#tab:user_study}
:::
::::

Since the bicubic degradation process does not generalize well to images which do not follow this pre-processing, we also train a generic model, *LDM-BSR*, by using more diverse degradation. The results are shown in Sec. [10.6.1](#suppsubsubsec:bsr){reference-type="ref" reference="suppsubsubsec:bsr"}.

:::: footnotesize
::: adjustbox
max width=

  **Method**                                                                   FID $\downarrow$                          IS $\uparrow$             PSNR $\uparrow$                 SSIM $\uparrow$           $N_{\text{params}}$   $[\frac{\text{samples}}{s}] (^*)$
  ------------------------------------------------------- ---------------------------------------------------------- --------------------- ------------------------------- -------------------------------- --------------------- -----------------------------------
  Image Regression [@DBLP:journals/corr/abs-2104-07636]                              15.2                                    121.1                    **27.9**                        **0.801**                     625M                          N/A
  SR3 [@DBLP:journals/corr/abs-2104-07636]                                           5.2                                   **180.1**             [26.4]{.underline}              [0.762]{.underline}                625M                          N/A
  *LDM-4* (ours, 100 steps)                                [2.8]{.underline}$^\dagger$/[4.8]{.underline}$^\ddagger$          166.3          24.4$\pm$`<!-- -->`{=html}3.8   0.69$\pm$`<!-- -->`{=html}0.14        **169M**                       4.62
  emphLDM-4 (ours, big, 100 steps)                                   **2.4**$^\dagger$/**4.3**$^\ddagger$             [174.9]{.underline}   24.7$\pm$`<!-- -->`{=html}4.1   0.71$\pm$`<!-- -->`{=html}0.15          552M                          4.5
  *LDM-4* (ours, 50 steps, guiding)                                      4.4$^\dagger$/6.4$^\ddagger$                        153.7          25.8$\pm$`<!-- -->`{=html}3.7   0.74$\pm$`<!-- -->`{=html}0.12   [184M]{.underline}                  0.38

  : $\times 4$ upscaling results on ImageNet-Val. ($256^2$); $^\dagger$: FID features computed on validation split, $^\ddagger$: FID features computed on train split; $^*$: Assessed on a NVIDIA A100 {#tab:srtable}
:::
::::

## Inpainting with Latent Diffusion {#subsec:inpainting}

Inpainting is the task of filling masked regions of an image with new content either because parts of the image are are corrupted or to replace existing but undesired content within the image. We evaluate how our general approach for conditional image generation compares to more specialized, state-of-the-art approaches for this task. Our evaluation follows the protocol of LaMa[@lama], a recent inpainting model that introduces a specialized architecture relying on Fast Fourier Convolutions[@Chi2020FastFC]. The exact training & evaluation protocol on Places[@places] is described in Sec. [11.2.2](#suppsec:inpainting){reference-type="ref" reference="suppsec:inpainting"}.

We first analyze the effect of different design choices for the first stage.

:::: center
::: adjustbox
max width=

+:-------------------------+:----------------:+-----------------:+-----------------:+:-----------:+:-------:+
|                          | train throughput | sampling throughput$^{\dagger}$     | train+val   | FID@2k  |
+--------------------------+------------------+------------------+------------------+-------------+---------+
| **Model** (*reg.*-type)  | samples/sec.     | \@256            | \@512            | hours/epoch | epoch 6 |
+--------------------------+------------------+------------------+------------------+-------------+---------+
| *LDM-1* (no first stage) | 0.11             | 0.26             | 0.07             | 20.66       | 24.74   |
+--------------------------+------------------+------------------+------------------+-------------+---------+
| *LDM-4* (*KL*, w/ attn)  | 0.32             | 0.97             | 0.34             | 7.66        | 15.21   |
+--------------------------+------------------+------------------+------------------+-------------+---------+
| *LDM-4* (*VQ*, w/ attn)  | 0.33             | 0.97             | 0.34             | 7.04        | 14.99   |
+--------------------------+------------------+------------------+------------------+-------------+---------+
| *LDM-4* (*VQ*, w/o attn) | 0.35             | 0.99             | 0.36             | 6.66        | 15.95   |
+--------------------------+------------------+------------------+------------------+-------------+---------+

: Assessing inpainting efficiency. $^{\dagger}$: Deviations from Fig. [7](#fig:speedplot){reference-type="ref" reference="fig:speedplot"} due to varying GPU settings/batch sizes the supplement. {#inpaintingefficiency}
:::
::::

In particular, we compare the inpainting efficiency of *LDM-1* (a pixel-based conditional DM) with *LDM-4*, for both *KL* and *VQ* regularizations, as well as *VQ-LDM-4* without any attention in the first stage (see Tab. [9](#tab:firststagetablecomplete){reference-type="ref" reference="tab:firststagetablecomplete"}), where the latter reduces GPU memory for decoding at high resolutions. For comparability, we fix the number of parameters for all models. Tab. [7](#inpaintingefficiency){reference-type="ref" reference="inpaintingefficiency"} reports the training and sampling throughput at resolution $256^{2}$ and $512^{2}$, the total training time in hours per epoch and the FID score on the validation split after six epochs. Overall, we observe a speed-up of at least $2.7\times$ between pixel- and latent-based diffusion models while improving FID scores by a factor of at least $1.6\times$.

The comparison with other inpainting approaches in Tab. [8](#inpaintingtable){reference-type="ref" reference="inpaintingtable"} shows that our model with attention improves the overall image quality as measured by FID over that of [@lama]. LPIPS between the unmasked images and our samples is slightly higher than that of [@lama]. We attribute this to [@lama] only producing a single result which tends to recover more of an average image compared to the diverse results produced by our LDM Fig. [21](#fig:suppinpaintingsamples){reference-type="ref" reference="fig:suppinpaintingsamples"}. Additionally in a user study (Tab. [5](#tab:user_study){reference-type="ref" reference="tab:user_study"}) human subjects favor our results over those of [@lama].

Based on these initial results, we also trained a larger diffusion model (*big* in Tab. [8](#inpaintingtable){reference-type="ref" reference="inpaintingtable"}) in the latent space of the *VQ*-regularized first stage without attention. Following [@DBLP:journals/corr/abs-2105-05233], the UNet of this diffusion model uses attention layers on three levels of its feature hierarchy, the BigGAN [@bigganbrock] residual block for up- and downsampling and has 387M parameters instead of 215M. After training, we noticed a discrepancy in the quality of samples produced at resolutions $256^2$ and $512^2$, which we hypothesize to be caused by the additional attention modules. However, fine-tuning the model for half an epoch at resolution $512^2$ allows the model to adjust to the new feature statistics and sets a new state of the art FID on image inpainting (*big, w/o attn, w/ ft* in Tab. [8](#inpaintingtable){reference-type="ref" reference="inpaintingtable"}, Fig. [11](#inpaintingremoval){reference-type="ref" reference="inpaintingremoval"}.).

::::: center
:::: footnotesize
::: adjustbox
max width=

+-----------------------------+-----------------------------------------------------+-----------------------------------------------------+
|                             | **40-50% masked**                                   | **All samples**                                     |
+:============================+===================:+===============================:+===================:+===============================:+
| 2-3 (lr)4-5 **Method**      | FID $\downarrow$   | LPIPS $\downarrow$             | FID $\downarrow$   | LPIPS $\downarrow$             |
+-----------------------------+--------------------+--------------------------------+--------------------+--------------------------------+
| *LDM-4* (ours, big, w/ ft)  | **9.39**           | [0.246]{.underline}$\pm$ 0.042 | **1.50**           | [0.137]{.underline}$\pm$ 0.080 |
+-----------------------------+--------------------+--------------------------------+--------------------+--------------------------------+
| *LDM-4* (ours, big, w/o ft) | 12.89              | 0.257$\pm$ 0.047               | 2.40               | [0.142]{.underline}$\pm$ 0.085 |
+-----------------------------+--------------------+--------------------------------+--------------------+--------------------------------+
| *LDM-4* (ours, w/ attn)     | 11.87              | 0.257$\pm$ 0.042               | 2.15               | [0.144]{.underline}$\pm$ 0.084 |
+-----------------------------+--------------------+--------------------------------+--------------------+--------------------------------+
| *LDM-4* (ours, w/o attn)    | 12.60              | 0.259$\pm$ 0.041               | 2.37               | [0.145]{.underline}$\pm$ 0.084 |
+-----------------------------+--------------------+--------------------------------+--------------------+--------------------------------+
| LaMa[@lama]$^\dagger$       | 12.31              | **0.243**$\pm$ 0.038           | 2.23               | **0.134**$\pm$ 0.080           |
+-----------------------------+--------------------+--------------------------------+--------------------+--------------------------------+
| LaMa[@lama]                 | 12.0               | **0.24**                       | 2.21               | [0.14]{.underline}             |
+-----------------------------+--------------------+--------------------------------+--------------------+--------------------------------+
| CoModGAN[@comodgan]         | [10.4]{.underline} | 0.26                           | [1.82]{.underline} | 0.15                           |
+-----------------------------+--------------------+--------------------------------+--------------------+--------------------------------+
| RegionWise[@regionwise]     | 21.3               | 0.27                           | 4.75               | 0.15                           |
+-----------------------------+--------------------+--------------------------------+--------------------+--------------------------------+
| DeepFill v2[@deepfillv2]    | 22.1               | 0.28                           | 5.20               | 0.16                           |
+-----------------------------+--------------------+--------------------------------+--------------------+--------------------------------+
| EdgeConnect[@edgeconnect]   | 30.5               | 0.28                           | 8.37               | 0.16                           |
+-----------------------------+--------------------+--------------------------------+--------------------+--------------------------------+

: Comparison of inpainting performance on 30k crops of size $512\times 512$ from test images of Places[@places]. The column *40-50%* reports metrics computed over hard examples where 40-50% of the image region have to be inpainted. $^\dagger$recomputed on our test set, since the original test set used in [@lama] was not available. {#inpaintingtable}
:::
::::
:::::

# Limitations & Societal Impact {#sec:limitations}

#### Limitations

While LDMs significantly reduce computational requirements compared to pixel-based approaches, their sequential sampling process is still slower than that of GANs. Moreover, the use of LDMs can be questionable when high precision is required: although the loss of image quality is very small in our $f=4$ autoencoding models (see Fig. [1](#fig:firststagecomparison){reference-type="ref" reference="fig:firststagecomparison"}), their reconstruction capability can become a bottleneck for tasks that require fine-grained accuracy in pixel space. We assume that our superresolution models (Sec. [4.4](#subsec:superres){reference-type="ref" reference="subsec:superres"}) are already somewhat limited in this respect.

#### Societal Impact

Generative models for media like imagery are a double-edged sword: On the one hand, they enable various creative applications, and in particular approaches like ours that reduce the cost of training and inference have the potential to facilitate access to this technology and democratize its exploration. On the other hand, it also means that it becomes easier to create and disseminate manipulated data or spread misinformation and spam. In particular, the deliberate manipulation of images ("deep fakes") is a common problem in this context, and women in particular are disproportionately affected by it [@denton2021workshop; @franks2018sex].

Generative models can also reveal their training data [@carlini2021extracting; @tinsley2021face], which is of great concern when the data contain sensitive or personal information and were collected without explicit consent. However, the extent to which this also applies to DMs of images is not yet fully understood.

Finally, deep learning modules tend to reproduce or exacerbate biases that are already present in the data [@torralba2011unbiased; @jain2020imperfect; @esser2020note]. While diffusion models achieve better coverage of the data distribution than GAN-based approaches, the extent to which our two-stage approach that combines adversarial training and a likelihood-based objective misrepresents the data remains an important research question.

For a more general, detailed discussion of the ethical considerations of deep generative models, see [@denton2021workshop].

# Conclusion {#sec:conclusion}

We have presented latent diffusion models, a simple and efficient way to significantly improve both the training and sampling efficiency of denoising diffusion models without degrading their quality. Based on this and our cross-attention conditioning mechanism, our experiments could demonstrate favorable results compared to state-of-the-art methods across a wide range of conditional image synthesis tasks without task-specific architectures. [^2]

::: center
**Appendix**
:::

# Changelog

Here we list changes between this version (<https://arxiv.org/abs/2112.10752v2>) of the paper and the previous version, <https://arxiv.org/abs/2112.10752v1>.

- We updated the results on text-to-image synthesis in Sec. [4.3](#subsec:conditionallatentdiffusion){reference-type="ref" reference="subsec:conditionallatentdiffusion"} which were obtained by training a new, larger model (1.45B parameters). This also includes a new comparison to very recent competing methods on this task that were published on arXiv at the same time as ([@DBLP:journals/corr/abs-2112-10741; @DBLP:journals/corr/abs-2111-13792]) or after ([@DBLP:journals/corr/abs-2203-13131]) the publication of our work.

- We updated results on class-conditional synthesis on ImageNet in Sec. [4.1](#subsec:reduced_compute){reference-type="ref" reference="subsec:reduced_compute"}, Tab. [4](#tab:imagenet_main_numbers){reference-type="ref" reference="tab:imagenet_main_numbers"} (see also Sec. [10.4](#suppsec:cin){reference-type="ref" reference="suppsec:cin"}) obtained by retraining the model with a larger batch size. The corresponding qualitative results in Fig. [26](#fig:imagenet_samples_1){reference-type="ref" reference="fig:imagenet_samples_1"} and Fig. [27](#fig:imagenet_samples_2){reference-type="ref" reference="fig:imagenet_samples_2"} were also updated. Both the updated text-to-image and the class-conditional model now use classifier-free guidance [@ho2021classifier] as a measure to increase visual fidelity.

- We conducted a user study (following the scheme suggested by Saharia et al [@DBLP:journals/corr/abs-2104-07636]) which provides additional evaluation for our inpainting (Sec. [4.5](#subsec:inpainting){reference-type="ref" reference="subsec:inpainting"}) and superresolution models (Sec. [4.4](#subsec:superres){reference-type="ref" reference="subsec:superres"}).

- Added Fig. [5](#fig:text2img_samples){reference-type="ref" reference="fig:text2img_samples"} to the main paper, moved Fig. [18](#fig:srgeneralization){reference-type="ref" reference="fig:srgeneralization"} to the appendix, added Fig. [13](#fig:text2img_conv){reference-type="ref" reference="fig:text2img_conv"} to the appendix.

# Detailed Information on Denoising Diffusion Models {#suppsec:dmdetails}

Diffusion models can be specified in terms of a signal-to-noise ratio $\text{SNR}(t)=\frac{\alpha_t^2}{\sigma_t^2}$ consisting of sequences $(\alpha_t)_{t=1}^T$ and $(\sigma_t)_{t=1}^T$ which, starting from a data sample $x_0$, define a forward diffusion process $q$ as $$\begin{equation}
  q(x_t \vert x_0) = \mathcal{N}(x_t \vert \alpha_t x_0, \sigma_t^2 \mathbb{I})
\end{equation}$$ with the Markov structure for $s < t$: $$\begin{align}
  q(x_t \vert x_s) &= \mathcal{N}(x_t \vert \alpha_{t\vert s} x_s, \sigma_{t\vert s}^2 \mathbb{I}) \\
  \alpha_{t\vert s} &= \frac{\alpha_t}{\alpha_s} \\
  \sigma_{t\vert s}^2 &= \sigma_t^2 - \alpha_{t\vert s}^2 \sigma_s^2
\end{align}$$

Denoising diffusion models are generative models $p(x_0)$ which revert this process with a similar Markov structure running backward in time, they are specified as $$\begin{equation}
  p(x_0) = \int_{z} p(x_T) \prod_{t=1}^T p(x_{t-1} \vert x_t)
\end{equation}$$ The evidence lower bound (ELBO) associated with this model then decomposes over the discrete time steps as $$\begin{equation}
  -\log p(x_0) \le \mathbb{KL}(q(x_T \vert x_0) \vert p(x_T)) + \sum_{t=1}^T
  \mathbb{E}_{q(x_t \vert x_0)} \mathbb{KL}(q(x_{t-1} \vert x_t, x_0) \vert p(x_{t-1}
  \vert x_t))
\end{equation}$$ The prior $p(x_T)$ is typically choosen as a standard normal distribution and the first term of the ELBO then depends only on the final signal-to-noise ratio $\text{SNR}(T)$. To minimize the remaining terms, a common choice to parameterize $p(x_{t-1} \vert x_t)$ is to specify it in terms of the true posterior $q(x_{t-1} \vert x_t, x_0)$ but with the unknown $x_0$ replaced by an estimate $x_\theta(x_t, t)$ based on the current step $x_t$. This gives [@DBLP:journals/corr/abs-2107-00630] $$\begin{align}
  p(x_{t-1} \vert x_t) &\coloneqq q(x_{t-1} \vert x_t, x_\theta(x_t, t)) \\
  &= \mathcal{N}(x_{t-1} \vert \mu_\theta(x_t, t), \sigma_{t\vert t-1}^2
  \frac{\sigma_{t-1}^2}{\sigma_t^2}\mathbb{I}),
\end{align}$$ where the mean can be expressed as $$\begin{equation}
  \mu_\theta(x_t, t) = \frac{\alpha_{t\vert t-1} \sigma_{t-1}^2}{\sigma_t^2}
  x_t + \frac{\alpha_{t-1} \sigma_{t\vert t-1}^2}{\sigma_t^2} x_\theta(x_t, t).
\end{equation}$$ In this case, the sum of the ELBO simplify to $$\begin{equation}
  \sum_{t=1}^T \mathbb{E}_{q(x_t \vert x_0)} \mathbb{KL}(q(x_{t-1} \vert x_t, x_0) \vert p(x_{t-1}) =
  \sum_{t=1}^T \mathbb{E}_{\mathcal{N}(\epsilon \vert 0, \mathbb{I})} \frac{1}{2}(\text{SNR}(t-1) -
  \text{SNR}(t)) \Vert x_0 - x_\theta(\alpha_t x_0 + \sigma_t \epsilon, t) \Vert^2
\end{equation}$$ Following [@DBLP:conf/nips/HoJA20], we use the reparameterization $$\begin{equation}
  \epsilon_\theta(x_t, t) = (x_t - \alpha_t x_\theta(x_t, t))/\sigma_t
\end{equation}$$ to express the reconstruction term as a denoising objective, $$\begin{equation}
  \Vert x_0 - x_\theta(\alpha_t x_0 + \sigma_t \epsilon, t) \Vert^2 =
  \frac{\sigma_t^2}{\alpha_t^2} \Vert \epsilon - \epsilon_\theta(\alpha_t x_0 +
  \sigma_t \epsilon, t) \Vert^2
\end{equation}$$ and the reweighting, which assigns each of the terms the same weight and results in Eq. [\[eq:dmloss\]](#eq:dmloss){reference-type="eqref" reference="eq:dmloss"}.

# Image Guiding Mechanisms {#subsec:imageguiding}

An intriguing feature of diffusion models is that unconditional models can be conditioned at test-time [@DBLP:journals/corr/abs-2011-13456; @DBLP:journals/corr/Sohl-DicksteinW15; @DBLP:journals/corr/abs-2105-05233]. In particular, [@DBLP:journals/corr/abs-2105-05233] presented an algorithm to guide both unconditional and conditional models trained on the ImageNet dataset with a classifier $\log p_{\Phi}(y\vert x_t)$, trained on each $x_t$ of the diffusion process. We directly build on this formulation and introduce post-hoc *image-guiding*:

For an epsilon-parameterized model with fixed variance, the guiding algorithm as introduced in [@DBLP:journals/corr/abs-2105-05233] reads: $$\begin{equation}
\hat{\epsilon} \leftarrow \epsilon_\theta(z_t, t) + \sqrt{1-\alpha_t^2}\; \nabla_{z_t} \log p_{\Phi}(y\vert z_t) \; .
\label{eq:epsilonupdate}
\end{equation}$$

This can be interpreted as an update correcting the "score" $\epsilon_\theta$ with a conditional distribution $\log p_{\Phi}(y\vert z_t)$.

So far, this scenario has only been applied to single-class classification models. We re-interpret the guiding distribution $p_{\Phi}(y\vert T(\mathcal{D}(z_0(z_t))))$ as a general purpose image-to-image translation task given a target image $y$, where $T$ can be any differentiable transformation adopted to the image-to-image translation task at hand, such as the identity, a downsampling operation or similar.\
As an example, we can assume a Gaussian guider with fixed variance $\sigma^2=1$, such that $$\begin{equation}
\log p_{\Phi}(y\vert z_t) = -\frac{1}{2}\Vert y- T(\mathcal{D}(z_0(z_t))) \Vert^2_2
\end{equation}$$ becomes a $L_2$ regression objective.

Fig. [14](#fig:convolutionalguiding){reference-type="ref" reference="fig:convolutionalguiding"} demonstrates how this formulation can serve as an upsampling mechanism of an unconditional model trained on $256^2$ images, where unconditional samples of size $256^2$ guide the convolutional synthesis of $512^2$ images and $T$ is a $2\times$ bicubic downsampling. Following this motivation, we also experiment with a perceptual similarity guiding and replace the $L_2$ objective with the LPIPS [@lpips] metric, see Sec. [4.4](#subsec:superres){reference-type="ref" reference="subsec:superres"}.

# Additional Results

## Choosing the Signal-to-Noise Ratio for High-Resolution Synthesis {#suppsec:rescale}

As discussed in Sec. [4.3.2](#subsubsec:beyond){reference-type="ref" reference="subsubsec:beyond"}, the signal-to-noise ratio induced by the variance of the latent space ($\text{Var(z)}/\sigma^2_t$) significantly affects the results for convolutional sampling. For example, when training a LDM directly in the latent space of a KL-regularized model (see Tab. [9](#tab:firststagetablecomplete){reference-type="ref" reference="tab:firststagetablecomplete"}), this ratio is very high, such that the model allocates a lot of semantic detail early on in the reverse denoising process. In contrast, when rescaling the latent space by the component-wise standard deviation of the latents as described in Sec. [13](#suppsec:ae){reference-type="ref" reference="suppsec:ae"}, the SNR is descreased. We illustrate the effect on convolutional sampling for semantic image synthesis in Fig. [15](#fig:convolutionalrescaling){reference-type="ref" reference="fig:convolutionalrescaling"}. Note that the VQ-regularized space has a variance close to $1$, such that it does not have to be rescaled.

## Full List of all First Stage Models

We provide a complete list of various autoenconding models trained on the OpenImages dataset in Tab. [9](#tab:firststagetablecomplete){reference-type="ref" reference="tab:firststagetablecomplete"}.

::::: center
:::: footnotesize
::: adjustbox
max width=0.9

                         $f$                         $\vert \mathcal{Z} \vert$   $c$   **R-FID** $\downarrow$   **R-IS** $\uparrow$   **PSNR** $\uparrow$   **PSIM** $\downarrow$   **SSIM** $\uparrow$
  ------------------------------------------------- --------------------------- ----- ------------------------ --------------------- --------------------- ----------------------- ---------------------
   16 *VQGAN* [@DBLP:journals/corr/abs-2012-09841]             16384             256            4.98                    --              19.9 $\pm 3.4$         1.83 $\pm 0.42$        0.51 $\pm 0.18$
   16 *VQGAN* [@DBLP:journals/corr/abs-2012-09841]             1024              256            7.94                    --              19.4 $\pm 3.3$         1.98 $\pm 0.43$        0.50 $\pm 0.18$
   8 *DALL-E* [@DBLP:journals/corr/abs-2102-12092]             8192              \-            32.01                    --              22.8 $\pm 2.1$         1.95 $\pm 0.51$        0.73 $\pm 0.13$
                         32                                    16384             16            31.83             40.40 $\pm 1.07$      17.45 $\pm 2.90$        2.58 $\pm 0.48$        0.41 $\pm 0.18$
                         16                                    16384              8             5.15             144.55 $\pm 3.74$     20.83 $\pm 3.61$        1.73 $\pm 0.43$        0.54 $\pm 0.18$
                          8                                    16384              4             1.14             201.92 $\pm 3.97$     23.07 $\pm 3.99$        1.17 $\pm 0.36$        0.65 $\pm 0.16$
                          8                                     256               4             1.49             194.20 $\pm 3.87$     22.35 $\pm 3.81$        1.26 $\pm 0.37$        0.62 $\pm 0.16$
                          4                                    8192               3             0.58             224.78 $\pm 5.35$     27.43 $\pm 4.26$        0.53 $\pm 0.21$        0.82 $\pm 0.10$
                     4$^\dagger$                               8192               3             1.06             221.94 $\pm 4.58$     25.21 $\pm 4.17$        0.72 $\pm 0.26$        0.76 $\pm 0.12$
                          4                                     256               3             0.47             223.81 $\pm 4.58$     26.43 $\pm 4.22$        0.62 $\pm 0.24$        0.80 $\pm 0.11$
                          2                                    2048               2             0.16             232.75 $\pm 5.09$     30.85 $\pm 4.12$        0.27 $\pm 0.12$        0.91 $\pm 0.05$
                          2                                     64                2             0.40             226.62 $\pm 4.83$     29.13 $\pm 3.46$        0.38 $\pm 0.13$        0.90 $\pm 0.05$
                         32                                     KL               64             2.04             189.53 $\pm 3.68$     22.27 $\pm 3.93$        1.41 $\pm 0.40$        0.61 $\pm 0.17$
                         32                                     KL               16             7.3              132.75 $\pm 2.71$     20.38 $\pm 3.56$        1.88 $\pm 0.45$        0.53 $\pm 0.18$
                         16                                     KL               16             0.87             210.31 $\pm 3.97$     24.08 $\pm 4.22$        1.07 $\pm 0.36$        0.68 $\pm 0.15$
                         16                                     KL                8             2.63             178.68 $\pm 4.08$     21.94 $\pm 3.92$        1.49 $\pm 0.42$        0.59 $\pm 0.17$
                          8                                     KL                4             0.90             209.90 $\pm 4.92$     24.19 $\pm 4.19$        1.02 $\pm 0.35$        0.69 $\pm 0.15$
                          4                                     KL                3             0.27             227.57 $\pm 4.89$     27.53 $\pm 4.54$        0.55 $\pm 0.24$        0.82 $\pm 0.11$
                          2                                     KL                2            0.086             232.66 $\pm 5.16$     32.47 $\pm 4.19$        0.20 $\pm 0.09$        0.93 $\pm 0.04$

  : Complete autoencoder zoo trained on OpenImages, evaluated on ImageNet-Val. $\dagger$ denotes an attention-free autoencoder. {#tab:firststagetablecomplete}
:::
::::
:::::

## Layout-to-Image Synthesis {#suppsec:bboxtoimage}

::: adjustbox
max width=.7

                                                     COCO$256 \times 256$   OpenImages $256 \times 256$   OpenImages $512\times 512$
  ------------------------------------------------- ---------------------- ----------------------------- ----------------------------
  2-4 **Method**                                       FID$\downarrow$            FID$\downarrow$              FID$\downarrow$
  LostGAN-V2 [@DBLP:journals/corr/abs-2003-11571]           42.55                       \-                            \-
  OC-GAN [@DBLP:conf/aaai/SylvainZBH021]                    41.65                       \-                            \-
  SPADE [@Park_2019_CVPR]                            [41.11]{.underline}                \-                            \-
  VQGAN+T [@DBLP:journals/corr/abs-2105-06458]              56.58               [45.33]{.underline}          [48.11]{.underline}
  *LDM-8* (100 steps, ours)                            42.06$^\dagger$                  \-                            \-
  *LDM-4* (200 steps, ours)                             **40.91**$^*$                **32.02**                    **35.80**

  : Quantitative comparison of our layout-to-image models on the COCO [@DBLP:conf/cvpr/CaesarUF18] and OpenImages [@DBLP:journals/corr/abs-1811-00982] datasets. $^\dagger$: Training from scratch on COCO; $^*$: Finetuning from OpenImages. {#tab:layout2img}
:::

Here we provide the quantitative evaluation and additional samples for our layout-to-image models from Sec. [4.3.1](#subsubsec:crossattn2img){reference-type="ref" reference="subsubsec:crossattn2img"}. We train a model on the COCO [@DBLP:conf/cvpr/CaesarUF18] and one on the OpenImages [@DBLP:journals/corr/abs-1811-00982] dataset, which we subsequently additionally finetune on COCO. Tab [10](#tab:layout2img){reference-type="ref" reference="tab:layout2img"} shows the result. Our COCO model reaches the performance of recent state-of-the art models in layout-to-image synthesis, when following their training and evaluation protocol [@DBLP:conf/aaai/SylvainZBH021]. When finetuning from the OpenImages model, we surpass these works. Our OpenImages model surpasses the results of Jahn et al [@DBLP:journals/corr/abs-2105-06458] by a margin of nearly 11 in terms of FID. In Fig. [16](#fig:lay2img_samples){reference-type="ref" reference="fig:lay2img_samples"} we show additional samples of the model finetuned on COCO.

## Class-Conditional Image Synthesis on ImageNet {#suppsec:cin}

Tab. [11](#tab:imagenet_numbers){reference-type="ref" reference="tab:imagenet_numbers"} contains the results for our class-conditional LDM measured in FID and Inception score (IS). LDM-8 requires significantly fewer parameters and compute requirements (see Tab. [18](#tab:compute_vs_fid){reference-type="ref" reference="tab:compute_vs_fid"}) to achieve very competitive performance. Similar to previous work, we can further boost the performance by training a classifier on each noise scale and guiding with it, see Sec. [9](#subsec:imageguiding){reference-type="ref" reference="subsec:imageguiding"}. Unlike the pixel-based methods, this classifier is trained very cheaply in latent space. For additional qualitative results, see Fig. [26](#fig:imagenet_samples_1){reference-type="ref" reference="fig:imagenet_samples_1"} and Fig. [27](#fig:imagenet_samples_2){reference-type="ref" reference="fig:imagenet_samples_2"}.

::: adjustbox
max width=

  **Method**                                           FID$\downarrow$                 IS$\uparrow$               Precision$\uparrow$    Recall$\uparrow$    $N_{\text{params}}$
  -------------------------------------------------- -------------------- -------------------------------------- --------------------- -------------------- --------------------- ----------------------------------------------------------------------------------------------------------
  SR3 [@DBLP:journals/corr/abs-2104-07636]                  11.30                           \-                            \-                    \-                  625M                                                              \-
  ImageBART [@DBLP:journals/corr/abs-2108-08827]            21.19                           \-                            \-                    \-                  3.5B                                                              \-
  ImageBART [@DBLP:journals/corr/abs-2108-08827]             7.44                           \-                            \-                    \-                  3.5B                                                      0.05 acc. rate$^*$
  VQGAN+T [@DBLP:journals/corr/abs-2012-09841]              17.04                  70.6$\pm\text{1.8}$                    \-                    \-                  1.3B                                                              \-
  VQGAN+T [@DBLP:journals/corr/abs-2012-09841]               5.88                **304.8**$\pm\text{3.6}$                 \-                    \-                  1.3B                                                      0.05 acc. rate$^*$
  BigGan-deep [@bigganbrock]                                 6.95                  203.6$\pm\text{2.6}$                **0.87**                0.28                 340M                                                              \-
  ADM [@DBLP:journals/corr/abs-2105-05233]                  10.94                         100.98                         0.69                **0.63**               554M                                                        250 DDIM steps
  ADM-G [@DBLP:journals/corr/abs-2105-05233]                 4.59                         186.7                          0.82                  0.52                 608M                                                        250 DDIM steps
  ADM-G,ADM-U [@DBLP:journals/corr/abs-2105-05233]    [3.85]{.underline}                  221.72                         0.84                  0.53                  n/a                                                  2 $\times$ 250 DDIM steps
  CDM [@DBLP:journals/corr/abs-2106-15282]                   4.88                 158.71$\pm\text{2.26}$                  \-                    \-                   n/a                                                  2 $\times$ 100 DDIM steps
  *LDM-8* (ours)                                            17.41                  72.92$\pm\text{2.6}$                  0.65           [0.62]{.underline}          395M                                       200 DDIM steps, 2.9M train steps, batch size 64
  *LDM-8-G* (ours)                                           8.11                 190.43$\pm\text{2.60}$                 0.83                  0.36                 506M                             200 DDIM steps, classifier scale 10, 2.9M train steps, batch size 64
  *LDM-8* (ours)                                            15.51                 79.03$\pm\text{1.03}$                  0.65                **0.63**               395M                                       200 DDIM steps, 4.8M train steps, batch size 64
  *LDM-8-G* (ours)                                           7.76                 209.52$\pm\text{4.24}$          [0.84]{.underline}           0.35                 506M                             200 DDIM steps, classifier scale 10, 4.8M train steps, batch size 64
  *LDM-4* (ours)                                            10.56                 103.49$\pm\text{1.24}$                 0.71           [0.62]{.underline}          400M                                      250 DDIM steps, 178K train steps, batch size 1200
  *LDM-4-G* (ours)                                           3.95                 178.22$\pm\text{2.43}$                 0.81                  0.55                 400M           250 DDIM steps, unconditional guidance [@ho2021classifier] scale 1.25, 178K train steps, batch size 1200
  *LDM-4-G* (ours)                                         **3.60**        [247.67$\pm\text{5.59}$]{.underline}        **0.87**                0.48                 400M           250 DDIM steps, unconditional guidance [@ho2021classifier] scale 1.5, 178K train steps, batch size 1200

  : Comparison of a class-conditional ImageNet *LDM* with recent state-of-the-art methods for class-conditional image generation on the ImageNet [@DBLP:conf/cvpr/DengDSLL009] dataset.$^*$: Classifier rejection sampling with the given rejection rate as proposed in [@DBLP:conf/nips/RazaviOV19]. {#tab:imagenet_numbers}
:::

## Sample Quality vs. V100 Days (Continued from Sec. [4.1](#subsec:reduced_compute){reference-type="ref" reference="subsec:reduced_compute"}) {#sample-quality-vs.-v100-days-continued-from-sec.-subsecreduced_compute}

<figcaption><span id="fig:cin_traincourse_v100" data-label="fig:cin_traincourse_v100"></span> For completeness we also report the training progress of class-conditional <em>LDMs</em> on the ImageNet dataset for a fixed number of 35 V100 days. Results obtained with 100 DDIM steps <span class="citation" data-cites="DBLP:conf/iclr/SongME21"></span> and <span class="math inline"><em>κ</em> = 0</span>. FIDs computed on 5000 samples for efficiency reasons.</figcaption>
</figure>

For the assessment of sample quality over the training progress in Sec. [4.1](#subsec:reduced_compute){reference-type="ref" reference="subsec:reduced_compute"}, we reported FID and IS scores as a function of train steps. Another possibility is to report these metrics over the used resources in V100 days. Such an analysis is additionally provided in Fig. [17](#fig:cin_traincourse_v100){reference-type="ref" reference="fig:cin_traincourse_v100"}, showing qualitatively similar results.

## Super-Resolution {#suppsec:superres}

::::: table*
:::: footnotesize
::: adjustbox
max width=

  **Method**                                                          FID $\downarrow$                       IS $\uparrow$                    PSNR $\uparrow$                 SSIM $\uparrow$
  ------------------------------------------------------- ---------------------------------------- ---------------------------------- ------------------------------- --------------------------------
  Image Regression [@DBLP:journals/corr/abs-2104-07636]                     15.2                                 121.1                           **27.9**                        **0.801**
  SR3 [@DBLP:journals/corr/abs-2104-07636]                                  5.2                                **180.1**                           26.4                            0.762
  *LDM-4* (ours, 100 steps)                                 **2.8**$^\dagger$/**4.8**$^\ddagger$                 166.3                 24.4$\pm$`<!-- -->`{=html}3.8   0.69$\pm$`<!-- -->`{=html}0.14
  *LDM-4* (ours, 50 steps, guiding)                             4.4$^\dagger$/6.4$^\ddagger$                     153.7                 25.8$\pm$`<!-- -->`{=html}3.7   0.74$\pm$`<!-- -->`{=html}0.12
  *LDM-4* (ours, 100 steps, guiding)                            4.4$^\dagger$/6.4$^\ddagger$                     154.1                 25.7$\pm$`<!-- -->`{=html}3.7   0.73$\pm$`<!-- -->`{=html}0.12
  *LDM-4* (ours, 100 steps, +15 ep.)                       **2.6**$^\dagger$ / **4.6**$^\ddagger$   169.76$\pm$`<!-- -->`{=html}5.03   24.4$\pm$`<!-- -->`{=html}3.8   0.69$\pm$`<!-- -->`{=html}0.14
  Pixel-DM (100 steps, +15 ep.)                                5.1$^\dagger$ / 7.1$^\ddagger$       163.06$\pm$`<!-- -->`{=html}4.67   24.1$\pm$`<!-- -->`{=html}3.3   0.59$\pm$`<!-- -->`{=html}0.12
:::
::::
:::::

For better comparability between LDMs and diffusion models in pixel space, we extend our analysis from Tab. [6](#tab:srtable){reference-type="ref" reference="tab:srtable"} by comparing a diffusion model trained for the same number of steps and with a comparable number [^3] of parameters to our LDM. The results of this comparison are shown in the last two rows of Tab. [\[tab:srsupptable\]](#tab:srsupptable){reference-type="ref" reference="tab:srsupptable"} and demonstrate that LDM achieves better performance while allowing for significantly faster sampling. A qualitative comparison is given in Fig. [20](#suppsrimagenet){reference-type="ref" reference="suppsrimagenet"} which shows random samples from both LDM and the diffusion model in pixel space.

### LDM-BSR: General Purpose SR Model via Diverse Image Degradation {#suppsubsubsec:bsr}

To evaluate generalization of our LDM-SR, we apply it both on synthetic LDM samples from a class-conditional ImageNet model (Sec. [4.1](#subsec:reduced_compute){reference-type="ref" reference="subsec:reduced_compute"}) and images crawled from the internet. Interestingly, we observe that LDM-SR, trained only with a bicubicly downsampled conditioning as in [@DBLP:journals/corr/abs-2104-07636], does not generalize well to images which do not follow this pre-processing. Hence, to obtain a superresolution model for a wide range of real world images, which can contain complex superpositions of camera noise, compression artifacts, blurr and interpolations, we replace the bicubic downsampling operation in LDM-SR with the degration pipeline from [@bsrgan]. The BSR-degradation process is a degradation pipline which applies JPEG compressions noise, camera sensor noise, different image interpolations for downsampling, Gaussian blur kernels and Gaussian noise in a random order to an image. We found that using the bsr-degredation process with the original parameters as in [@bsrgan] leads to a very strong degradation process. Since a more moderate degradation process seemed apppropiate for our application, we adapted the parameters of the bsr-degradation (our adapted degradation process can be found in our code base at <https://github.com/CompVis/latent-diffusion>). Fig. [18](#fig:srgeneralization){reference-type="ref" reference="fig:srgeneralization"} illustrates the effectiveness of this approach by directly comparing *LDM-SR* with *LDM-BSR*. The latter produces images much sharper than the models confined to a fixed pre-processing, making it suitable for real-world applications. Further results of *LDM-BSR* are shown on LSUN-cows in Fig. [19](#fig:supercows){reference-type="ref" reference="fig:supercows"}.

# Implementation Details and Hyperparameters

## Hyperparameters

We provide an overview of the hyperparameters of all trained *LDM* models in Tab. [12](#tab:uncond_hyperparams){reference-type="ref" reference="tab:uncond_hyperparams"}, Tab. [13](#tab:cin_hyperparams){reference-type="ref" reference="tab:cin_hyperparams"}, Tab. [14](#tab:celeba_hyperparams){reference-type="ref" reference="tab:celeba_hyperparams"} and Tab. [15](#tab:cond_hyperparams){reference-type="ref" reference="tab:cond_hyperparams"}.

:::: center
::: adjustbox
max width=.8

                               CelebA-HQ $256 \times 256$    FFHQ $256 \times 256$    LSUN-Churches $256 \times 256$   LSUN-Bedrooms $256 \times 256$
  --------------------------- ---------------------------- ------------------------- -------------------------------- --------------------------------
  $f$                                      4                           4                            8                                4
  $z$-shape                     $64 \times 64 \times 3$     $64 \times 64 \times 3$                 \-                    $64 \times 64 \times 3$
  $\vert \mathcal{Z} \vert$               8192                       8192                           \-                              8192
  Diffusion steps                         1000                       1000                          1000                             1000
  Noise Schedule                         linear                     linear                        linear                           linear
  $N_{\text{params}}$                     274M                       274M                          294M                             274M
  Channels                                224                         224                          192                              224
  Depth                                    2                           2                            2                                2
  Channel Multiplier                    1,2,3,4                     1,2,3,4                     1,2,2,4,4                         1,2,3,4
  Attention resolutions                32, 16, 8                   32, 16, 8                   32, 16, 8, 4                      32, 16, 8
  Head Channels                            32                         32                            24                               32
  Batch Size                               48                         42                            96                               48
  Iterations$^*$                          410k                       635k                          500k                             1.9M
  Learning Rate                     $\text{9.6e-5}$             $\text{8.4e-5}$               $\text{5.e-5}$                  $\text{9.6e-5}$

  : Hyperparameters for the unconditional *LDMs* producing the numbers shown in Tab. [2](#tab:fids){reference-type="ref" reference="tab:fids"}. All models trained on a single NVIDIA A100. {#tab:uncond_hyperparams}
:::
::::

:::: center
::: adjustbox
max width=.8

                                        *LDM-1*                     *LDM-2*                     *LDM-4*                   *LDM-8*                  *LDM-16*                  *LDM-32*
  --------------------------- --------------------------- ---------------------------- ------------------------- ------------------------- ------------------------- -------------------------
  $z$-shape                    $256 \times 256 \times 3$   $128  \times 128 \times 2$   $64 \times 64 \times 3$   $32 \times 32 \times 4$   $16 \times 16 \times 8$   $88 \times 8 \times 32$
  $\vert \mathcal{Z} \vert$               \-                          2048                       8192                      16384                     16384                     16384
  Diffusion steps                        1000                         1000                       1000                      1000                      1000                      1000
  Noise Schedule                        linear                       linear                     linear                    linear                    linear                    linear
  Model Size                             396M                         391M                       391M                      395M                      395M                      395M
  Channels                                192                         192                         192                       256                       256                       256
  Depth                                    2                           2                           2                         2                         2                         2
  Channel Multiplier                  1,1,2,2,4,4                  1,2,2,4,4                    1,2,3,5                    1,2,4                     1,2,4                     1,2,4
  Number of Heads                          1                           1                           1                         1                         1                         1
  Batch Size                               7                           9                          40                        64                        112                       112
  Iterations                              2M                           2M                         2M                        2M                        2M                        2M
  Learning Rate                     $\text{4.9e-5}$             $\text{6.3e-5}$              $\text{8e-5}$            $\text{6.4e-5}$           $\text{4.5e-5}$           $\text{4.5e-5}$
  Conditioning                            CA                           CA                         CA                        CA                        CA                        CA
  CA-resolutions                       32, 16, 8                   32, 16, 8                   32, 16, 8                 32, 16, 8                 16, 8, 4                   8, 4, 2
  Embedding Dimension                     512                         512                         512                       512                       512                       512
  Transformers Depth                       1                           1                           1                         1                         1                         1

  : Hyperparameters for the conditional *LDMs* trained on the ImageNet dataset for the analysis in Sec. [4.1](#subsec:reduced_compute){reference-type="ref" reference="subsec:reduced_compute"}. All models trained on a single NVIDIA A100. {#tab:cin_hyperparams}
:::
::::

:::: center
::: adjustbox
max width=.8

                                        *LDM-1*                     *LDM-2*                     *LDM-4*                   *LDM-8*                  *LDM-16*                  *LDM-32*
  --------------------------- --------------------------- ---------------------------- ------------------------- ------------------------- ------------------------- -------------------------
  $z$-shape                    $256 \times 256 \times 3$   $128  \times 128 \times 2$   $64 \times 64 \times 3$   $32 \times 32 \times 4$   $16 \times 16 \times 8$   $88 \times 8 \times 32$
  $\vert \mathcal{Z} \vert$               \-                          2048                       8192                      16384                     16384                     16384
  Diffusion steps                        1000                         1000                       1000                      1000                      1000                      1000
  Noise Schedule                        linear                       linear                     linear                    linear                    linear                    linear
  Model Size                             270M                         265M                       274M                      258M                      260M                      258M
  Channels                                192                         192                         224                       256                       256                       256
  Depth                                    2                           2                           2                         2                         2                         2
  Channel Multiplier                  1,1,2,2,4,4                  1,2,2,4,4                    1,2,3,4                    1,2,4                     1,2,4                     1,2,4
  Attention resolutions                32, 16, 8                   32, 16, 8                   32, 16, 8                 32, 16, 8                 16, 8, 4                   8, 4, 2
  Head Channels                           32                           32                         32                        32                        32                        32
  Batch Size                               9                           11                         48                        96                        128                       128
  Iterations$^*$                         500k                         500k                       500k                      500k                      500k                      500k
  Learning Rate                      $\text{9e-5}$              $\text{1.1e-4}$             $\text{9.6e-5}$           $\text{9.6e-5}$           $\text{1.3e-4}$           $\text{1.3e-4}$

  : Hyperparameters for the unconditional *LDMs* trained on the CelebA dataset for the analysis in Fig. [7](#fig:speedplot){reference-type="ref" reference="fig:speedplot"}. All models trained on a single NVIDIA A100. $^*$: All models are trained for 500k iterations. If converging earlier, we used the best checkpoint for assessing the provided FID scores. {#tab:celeba_hyperparams}
:::
::::

:::: center
::: adjustbox
max width=.95

+---------------------------+-------------------------+---------------------------------------------------+------------------------+-------------------------+-------------------------+-------------------------+
| **Task**                  | Text-to-Image           | Layout-to-Image                                   | Class-Label-to-Image   | Super Resolution        | Inpainting              | Semantic-Map-to-Image   |
+:==========================+:=======================:+:=======================:+:=======================:+:======================:+:=======================:+:=======================:+:=======================:+
| **Dataset**               | LAION                   | OpenImages              | COCO                    | ImageNet               | ImageNet                | Places                  | Landscapes              |
+---------------------------+-------------------------+-------------------------+-------------------------+------------------------+-------------------------+-------------------------+-------------------------+
| $f$                       | 8                       | 4                       | 8                       | 4                      | 4                       | 4                       | 8                       |
+---------------------------+-------------------------+-------------------------+-------------------------+------------------------+-------------------------+-------------------------+-------------------------+
| $z$-shape                 | $32 \times 32 \times 4$ | $64 \times 64 \times 3$ | $32 \times 32 \times 4$ | $64 \times 64\times 3$ | $64 \times 64 \times 3$ | $64 \times 64 \times 3$ | $32 \times 32 \times 4$ |
+---------------------------+-------------------------+-------------------------+-------------------------+------------------------+-------------------------+-------------------------+-------------------------+
| $\vert \mathcal{Z} \vert$ | \-                      | 8192                    | 16384                   | 8192                   | 8192                    | 8192                    | 16384                   |
+---------------------------+-------------------------+-------------------------+-------------------------+------------------------+-------------------------+-------------------------+-------------------------+
| Diffusion steps           | 1000                    | 1000                    | 1000                    | 1000                   | 1000                    | 1000                    | 1000                    |
+---------------------------+-------------------------+-------------------------+-------------------------+------------------------+-------------------------+-------------------------+-------------------------+
| Noise Schedule            | linear                  | linear                  | linear                  | linear                 | linear                  | linear                  | linear                  |
+---------------------------+-------------------------+-------------------------+-------------------------+------------------------+-------------------------+-------------------------+-------------------------+
| Model Size                | 1.45B                   | 306M                    | 345M                    | 395M                   | 169M                    | 215M                    | 215M                    |
+---------------------------+-------------------------+-------------------------+-------------------------+------------------------+-------------------------+-------------------------+-------------------------+
| Channels                  | 320                     | 128                     | 192                     | 192                    | 160                     | 128                     | 128                     |
+---------------------------+-------------------------+-------------------------+-------------------------+------------------------+-------------------------+-------------------------+-------------------------+
| Depth                     | 2                       | 2                       | 2                       | 2                      | 2                       | 2                       | 2                       |
+---------------------------+-------------------------+-------------------------+-------------------------+------------------------+-------------------------+-------------------------+-------------------------+
| Channel Multiplier        | 1,2,4,4                 | 1,2,3,4                 | 1,2,4                   | 1,2,3,5                | 1,2,2,4                 | 1,4,8                   | 1,4,8                   |
+---------------------------+-------------------------+-------------------------+-------------------------+------------------------+-------------------------+-------------------------+-------------------------+
| Number of Heads           | 8                       | 1                       | 1                       | 1                      | 1                       | 1                       | 1                       |
+---------------------------+-------------------------+-------------------------+-------------------------+------------------------+-------------------------+-------------------------+-------------------------+
| Dropout                   | \-                      | \-                      | 0.1                     | \-                     | \-                      | \-                      | \-                      |
+---------------------------+-------------------------+-------------------------+-------------------------+------------------------+-------------------------+-------------------------+-------------------------+
| Batch Size                | 680                     | 24                      | 48                      | 1200                   | 64                      | 128                     | 48                      |
+---------------------------+-------------------------+-------------------------+-------------------------+------------------------+-------------------------+-------------------------+-------------------------+
| Iterations                | 390K                    | 4.4M                    | 170K                    | 178K                   | 860K                    | 360K                    | 360K                    |
+---------------------------+-------------------------+-------------------------+-------------------------+------------------------+-------------------------+-------------------------+-------------------------+
| Learning Rate             | $\text{1.0e-4}$         | $\text{4.8e-5}$         | $\text{4.8e-5}$         | $\text{1.0e-4}$        | $\text{6.4e-5}$         | $\text{1.0e-6}$         | $\text{4.8e-5}$         |
+---------------------------+-------------------------+-------------------------+-------------------------+------------------------+-------------------------+-------------------------+-------------------------+
| Conditioning              | CA                      | CA                      | CA                      | CA                     | concat                  | concat                  | concat                  |
+---------------------------+-------------------------+-------------------------+-------------------------+------------------------+-------------------------+-------------------------+-------------------------+
| (C)A-resolutions          | 32, 16, 8               | 32, 16, 8               | 32, 16, 8               | 32, 16, 8              | \-                      | \-                      | \-                      |
+---------------------------+-------------------------+-------------------------+-------------------------+------------------------+-------------------------+-------------------------+-------------------------+
| Embedding Dimension       | 1280                    | 512                     | 512                     | 512                    | \-                      | \-                      | \-                      |
+---------------------------+-------------------------+-------------------------+-------------------------+------------------------+-------------------------+-------------------------+-------------------------+
| Transformer Depth         | 1                       | 3                       | 2                       | 1                      | \-                      | \-                      | \-                      |
+---------------------------+-------------------------+-------------------------+-------------------------+------------------------+-------------------------+-------------------------+-------------------------+

: Hyperparameters for the conditional *LDMs* from Sec. [4](#sec:experiments){reference-type="ref" reference="sec:experiments"}. All models trained on a single NVIDIA A100 except for the inpainting model which was trained on eight V100. {#tab:cond_hyperparams}
:::
::::

## Implementation Details {#suppsec:implementation_details}

### Implementations of $\tau_\theta$ for conditional *LDMs* {#suppsubsubsec:transformer}

For the experiments on text-to-image and layout-to-image (Sec. [4.3.1](#subsubsec:crossattn2img){reference-type="ref" reference="subsubsec:crossattn2img"}) synthesis, we implement the conditioner $\tau_\theta$ as an unmasked transformer which processes a tokenized version of the input $y$ and produces an output $\zeta := \tau_\theta(y)$, where $\zeta \in \mathbb{R}^{M \times d_\tau}$. More specifically, the transformer is implemented from $N$ transformer blocks consisting of global self-attention layers, layer-normalization and position-wise MLPs as follows[^4]:

$$\begin{align}
&\zeta \leftarrow \text{TokEmb}(y) + \text{PosEmb(y)} \\
%
&\text{for } i=1,\dots,N: \nonumber \\
 &\quad \zeta_1 \leftarrow \text{LayerNorm}(\zeta) \\
 &\quad \zeta_2 \leftarrow \text{MultiHeadSelfAttention}(\zeta_1) + \zeta \\
 &\quad \zeta_3 \leftarrow \text{LayerNorm}(\zeta_2)  \\
 &\quad \zeta \leftarrow \text{MLP}(\zeta_3) + \zeta_2  \\
& \zeta \leftarrow \text{LayerNorm}(\zeta)  \\
\end{align}$$

With $\zeta$ available, the conditioning is mapped into the UNet via the cross-attention mechanism as depicted in Fig. [3](#fig:conditioning){reference-type="ref" reference="fig:conditioning"}. We modify the "ablated UNet" [@DBLP:journals/corr/abs-2105-05233] architecture and replace the self-attention layer with a shallow (unmasked) transformer consisting of $T$ blocks with alternating layers of (i) self-attention, (ii) a position-wise MLP and (iii) a cross-attention layer; see Tab. [16](#tab:transformertable){reference-type="ref" reference="tab:transformertable"}. Note that without (ii) and (iii), this architecture is equivalent to the "ablated UNet".

While it would be possible to increase the representational power of $\tau_\theta$ by additionally conditioning on the time step $t$, we do not pursue this choice as it reduces the speed of inference. We leave a more detailed analysis of this modification to future work.

For the text-to-image model, we rely on a publicly available[^5] tokenizer [@DBLP:journals/corr/abs-1910-03771]. The layout-to-image model discretizes the spatial locations of the bounding boxes and encodes each box as a $(l, b, c)$-tuple, where $l$ denotes the (discrete) top-left and $b$ the bottom-right position. Class information is contained in $c$.\
See Tab. [17](#tab:transformerhyperparams){reference-type="ref" reference="tab:transformerhyperparams"} for the hyperparameters of $\tau_\theta$ and Tab. [13](#tab:cin_hyperparams){reference-type="ref" reference="tab:cin_hyperparams"} for those of the UNet for both of the above tasks.\
Note that the class-conditional model as described in Sec. [4.1](#subsec:reduced_compute){reference-type="ref" reference="subsec:reduced_compute"} is also implemented via cross-attention, where $\tau_\theta$ is a single learnable embedding layer with a dimensionality of 512, mapping classes $y$ to $\zeta \in \mathbb{R}^{1\times 512}$.

::::: center
:::: footnotesize
::: adjustbox
max width=.45

+----------------------------------------------------------------------------------------------------+---------------------------------------------+
| **input**                                                                                          | $\mathbb{R}^{h \times w \times c}$          |
+:===================================================================================================+:===========================================:+
| LayerNorm                                                                                          | $\mathbb{R}^{h \times w \times c}$          |
+----------------------------------------------------------------------------------------------------+---------------------------------------------+
| Conv1x1                                                                                            | $\mathbb{R}^{h \times w \times d\cdot n_h}$ |
+----------------------------------------------------------------------------------------------------+---------------------------------------------+
| Reshape                                                                                            | $\mathbb{R}^{h\cdot w \times d\cdot n_h}$   |
+----------------------------------------------------------------------------------------------------+---------------------------------------------+
| $\times T \begin{cases*} \text{SelfAttention} \\ \text{MLP} \\ \text{CrossAttention} \end{cases*}$ | $\mathbb{R}^{h\cdot w \times d \cdot n_h}$  |
|                                                                                                    +---------------------------------------------+
|                                                                                                    | $\mathbb{R}^{h \cdot w \times d\cdot n_h}$  |
|                                                                                                    +---------------------------------------------+
|                                                                                                    | $\mathbb{R}^{h \cdot w \times d\cdot n_h}$  |
+----------------------------------------------------------------------------------------------------+---------------------------------------------+
| Reshape                                                                                            | $\mathbb{R}^{h \times w \times d\cdot n_h}$ |
+----------------------------------------------------------------------------------------------------+---------------------------------------------+
| Conv1x1                                                                                            | $\mathbb{R}^{h \times w \times c}$          |
+----------------------------------------------------------------------------------------------------+---------------------------------------------+

: Architecture of a transformer block as described in Sec. [11.2.1](#suppsubsubsec:transformer){reference-type="ref" reference="suppsubsubsec:transformer"}, replacing the self-attention layer of the standard "ablated UNet" architecture [@DBLP:journals/corr/abs-2105-05233]. Here, $n_h$ denotes the number of attention heads and $d$ the dimensionality per head. {#tab:transformertable}
:::
::::
:::::

:::: center
::: adjustbox
max width=.8

                **Text-to-Image**   **Layout-to-Image**
  ------------ ------------------- ---------------------
  seq-length           77                   92
  depth $N$            32                   16
  dim                 1280                  512

  : Hyperparameters for the experiments with transformer encoders in Sec. [4.3](#subsec:conditionallatentdiffusion){reference-type="ref" reference="subsec:conditionallatentdiffusion"}. {#tab:transformerhyperparams}
:::
::::

### Inpainting {#suppsec:inpainting}

For our experiments on image-inpainting in Sec. [4.5](#subsec:inpainting){reference-type="ref" reference="subsec:inpainting"}, we used the code of [@lama] to generate synthetic masks. We use a fixed set of 2k validation and 30k testing samples from Places[@places]. During training, we use random crops of size $256\times 256$ and evaluate on crops of size $512\times 512$. This follows the training and testing protocol in [@lama] and reproduces their reported metrics (see $^\dagger$ in Tab. [8](#inpaintingtable){reference-type="ref" reference="inpaintingtable"}). We include additional qualitative results of *LDM-4, w/ attn* in Fig. [21](#fig:suppinpaintingsamples){reference-type="ref" reference="fig:suppinpaintingsamples"} and of *LDM-4, w/o attn, big, w/ ft* in Fig. [22](#suppinpaintingremoval){reference-type="ref" reference="suppinpaintingremoval"}.

## Evaluation Details {#suppsubsec:eval}

This section provides additional details on evaluation for the experiments shown in Sec. [4](#sec:experiments){reference-type="ref" reference="sec:experiments"}.

### Quantitative Results in Unconditional and Class-Conditional Image Synthesis {#suppsubsubsec:fids}

We follow common practice and estimate the statistics for calculating the FID-, Precision- and Recall-scores [@FID; @DBLP:journals/corr/abs-1904-06991] shown in Tab. [2](#tab:fids){reference-type="ref" reference="tab:fids"} and [11](#tab:imagenet_numbers){reference-type="ref" reference="tab:imagenet_numbers"} based on 50k samples from our models and the entire training set of each of the shown datasets. For calculating FID scores we use the `torch-fidelity` package [@obukhov2020torchfidelity]. However, since different data processing pipelines might lead to different results [@parmar2021cleanfid], we also evaluate our models with the script provided by Dhariwal and Nichol [@DBLP:journals/corr/abs-2105-05233]. We find that results mainly coincide, except for the ImageNet and LSUN-Bedrooms datasets, where we notice slightly varying scores of 7.76 (`torch-fidelity`) vs. 7.77 (Nichol and Dhariwal) and 2.95 vs 3.0. For the future we emphasize the importance of a unified procedure for sample quality assessment. Precision and Recall are also computed by using the script provided by Nichol and Dhariwal.

### Text-to-Image Synthesis {#suppsubsubsec:text2img}

Following the evaluation protocol of [@DBLP:journals/corr/abs-2102-12092] we compute FID and Inception Score for the Text-to-Image models from Tab. [3](#tab:txt2img){reference-type="ref" reference="tab:txt2img"} by comparing generated samples with 30000 samples from the validation set of the MS-COCO dataset [@DBLP:journals/corr/LinMBHPRDZ14]. FID and Inception Scores are computed with `torch-fidelity`.

### Layout-to-Image Synthesis {#suppsubsubsec:layout2img}

For assessing the sample quality of our Layout-to-Image models from Tab. [10](#tab:layout2img){reference-type="ref" reference="tab:layout2img"} on the COCO dataset, we follow common practice [@DBLP:conf/aaai/SylvainZBH021; @DBLP:journals/corr/abs-2105-06458; @DBLP:journals/corr/abs-2003-11571] and compute FID scores the 2048 unaugmented examples of the COCO Segmentation Challenge split. To obtain better comparability, we use the exact same samples as in [@DBLP:journals/corr/abs-2105-06458]. For the OpenImages dataset we similarly follow their protocol and use 2048 center-cropped test images from the validation set.

### Super Resolution {#suppsubsubsec:sr}

We evaluate the super-resolution models on ImageNet following the pipeline suggested in [@DBLP:journals/corr/abs-2104-07636], images with a shorter size less than $256$ px are removed (both for training and evaluation). On ImageNet, the low-resolution images are produced using bicubic interpolation with anti-aliasing. FIDs are evaluated using `torch-fidelity` [@obukhov2020torchfidelity], and we produce samples on the validation split. For FID scores, we additionally compare to reference features computed on the train split, see Tab. [6](#tab:srtable){reference-type="ref" reference="tab:srtable"} and Tab. [\[tab:srsupptable\]](#tab:srsupptable){reference-type="ref" reference="tab:srsupptable"}.

### Efficiency Analysis {#suppsubsubsec:compute}

For efficiency reasons we compute the sample quality metrics plotted in Fig. [6](#fig:cin_traincourse){reference-type="ref" reference="fig:cin_traincourse"}, [17](#fig:cin_traincourse_v100){reference-type="ref" reference="fig:cin_traincourse_v100"} and [7](#fig:speedplot){reference-type="ref" reference="fig:speedplot"} based on 5k samples. Therefore, the results might vary from those shown in Tab. [2](#tab:fids){reference-type="ref" reference="tab:fids"} and [11](#tab:imagenet_numbers){reference-type="ref" reference="tab:imagenet_numbers"}. All models have a comparable number of parameters as provided in Tab. [13](#tab:cin_hyperparams){reference-type="ref" reference="tab:cin_hyperparams"} and [14](#tab:celeba_hyperparams){reference-type="ref" reference="tab:celeba_hyperparams"}. We maximize the learning rates of the individual models such that they still train stably. Therefore, the learning rates slightly vary between different runs Tab. [13](#tab:cin_hyperparams){reference-type="ref" reference="tab:cin_hyperparams"} and [14](#tab:celeba_hyperparams){reference-type="ref" reference="tab:celeba_hyperparams"}.

### User Study {#suppsubsubsec:user_study}

For the results of the user study presented in Tab. [5](#tab:user_study){reference-type="ref" reference="tab:user_study"} we followed the protocoll of [@DBLP:journals/corr/abs-2104-07636] and and use the 2-alternative force-choice paradigm to assess human preference scores for two distinct tasks. In Task-1 subjects were shown a low resolution/masked image between the corresponding ground truth high resolution/unmasked version and a synthesized image, which was generated by using the middle image as conditioning. For SuperResolution subjects were asked: *'Which of the two images is a better high quality version of the low resolution image in the middle?'*. For Inpainting we asked *'Which of the two images contains more realistic inpainted regions of the image in the middle?'*. In Task-2, humans were similarly shown the low-res/masked version and asked for preference between two corresponding images generated by the two competing methods. As in [@DBLP:journals/corr/abs-2104-07636] humans viewed the images for 3 seconds before responding.

# Computational Requirements {#suppsec:compute2}

:::: center
::: adjustbox
max width=.95

  ----------------------------------------------------------------------------------------------------------------- ------------------ ------------ ----------------- ---------------- --------------------- ------------------------- ------------------------ --------------------- ------------------
  **Method**                                                                                                            Generator       Classifier       Overall         Inference      $N_{\text{params}}$       FID$\downarrow$            IS$\uparrow$        Precision$\uparrow$   Recall$\uparrow$
                                                                                                                         Compute         Compute         Compute       Throughput$^*$

  **LSUN Churches $256^{2}$**
  StyleGAN2 [@DBLP:journals/corr/abs-1912-04958]$^\dagger$                                                                  64              \-             64                \-                 59M                    3.86                       \-                     \-                   \-
  *LDM-8* (ours, 100 steps, 410K)                                                                                           18              \-             18               6.80               256M                    4.02                       \-                    0.64                 0.52

  **LSUN Bedrooms $256^{2}$**
  ADM [@DBLP:journals/corr/abs-2105-05233]$^\dagger$ (1000 steps)                                                          232              \-             232              0.03               552M                     1.9                       \-                    0.66                 0.51
  *LDM-4* (ours, 200 steps, 1.9M)                                                                                           60              \-             55               1.07               274M                    2.95                       \-                    0.66                 0.48

  **CelebA-HQ $256^{2}$**
  *LDM-4* (ours, 500 steps, 410K)                                                                                          14.4             \-            14.4              0.43               274M                    5.11                       \-                    0.72                 0.49

  **FFHQ $256^{2}$**
  StyleGAN2 [@DBLP:journals/corr/abs-1912-04958]                                                                     32.13$^\ddagger$       \-       32.13$^\dagger$         \-                 59M                     3.8                       \-                     \-                   \-
  *LDM-4* (ours, 200 steps, 635K)                                                                                           26              \-             26               1.07               274M                    4.98                       \-                    0.73                 0.50

  **ImageNet $256^{2}$**
  VQGAN-f-4 (ours, first stage)                                                                                             29              \-             29                \-                 55M           0.58$^{\dagger\dagger}$             \-                     \-                   \-
  VQGAN-f-8 (ours, first stage)                                                                                             66              \-             66                \-                 68M           1.14$^{\dagger\dagger}$             \-                     \-                   \-
  BigGAN-deep [@bigganbrock]$^\dagger$                                                                                   128-256                         128-256             \-                340M                    6.95              203.6$\pm\text{2.6}$           0.87                 0.28
  ADM [@DBLP:journals/corr/abs-2105-05233] (250 steps) $^\dagger$                                                          916              \-             916              0.12               554M                    10.94                    100.98                  0.69                 0.63
  ADM-G [@DBLP:journals/corr/abs-2105-05233] (25 steps) $^\dagger$                                                         916              46             962              0.7                608M                    5.58                       \-                    0.81                 0.49
  ADM-G [@DBLP:journals/corr/abs-2105-05233] (250 steps)$^\dagger$                                                         916              46             962              0.07               608M                    4.59                     186.7                   0.82                 0.52
  ADM-G,ADM-U [@DBLP:journals/corr/abs-2105-05233] (250 steps)$^\dagger$                                                   329              30             349              n/a                 n/a                    3.85                     221.72                  0.84                 0.53
  *LDM-8-G* (ours, 100, 2.9M)                                                                                               79              12             91               1.93               506M                    8.11              190.4$\pm\text{2.6}$           0.83                 0.36
  *LDM-8* (ours, 200 ddim steps 2.9M, batch size 64)                                                                        79              \-             79               1.9                395M                    17.41                    72.92                   0.65                 0.62
  *LDM-4* (ours, 250 ddim steps 178K, batch size 1200)                                                                     271              \-             271              0.7                400M                    10.56            103.49$\pm\text{1.24}$          0.71                 0.62
  *LDM-4-G* (ours, 250 ddim steps 178K, batch size 1200, classifier-free guidance [@ho2021classifier] scale 1.25)          271              \-             271              0.4                400M                    3.95             178.22$\pm\text{2.43}$          0.81                 0.55
  *LDM-4-G* (ours, 250 ddim steps 178K, batch size 1200, classifier-free guidance [@ho2021classifier] scale 1.5)           271              \-             271              0.4                400M                    3.60             247.67$\pm\text{5.59}$          0.87                 0.48
  ----------------------------------------------------------------------------------------------------------------- ------------------ ------------ ----------------- ---------------- --------------------- ------------------------- ------------------------ --------------------- ------------------

  : Comparing compute requirements during training and inference throughput with state-of-the-art generative models. Compute during training in V100-days, numbers of competing methods taken from [@DBLP:journals/corr/abs-2105-05233] unless stated differently;$^*$: Throughput measured in samples/sec on a single NVIDIA A100;$^\dagger$: Numbers taken from [@DBLP:journals/corr/abs-2105-05233] ;$^\ddagger$: Assumed to be trained on 25M train examples; $^{\dagger\dagger}$: R-FID vs. ImageNet validation set {#tab:compute_vs_fid}
:::
::::

In Tab [18](#tab:compute_vs_fid){reference-type="ref" reference="tab:compute_vs_fid"} we provide a more detailed analysis on our used compute ressources and compare our best performing models on the CelebA-HQ, FFHQ, LSUN and ImageNet datasets with the recent state of the art models by using their provided numbers, [@DBLP:journals/corr/abs-2105-05233]. As they report their used compute in V100 days and we train all our models on a single NVIDIA A100 GPU, we convert the A100 days to V100 days by assuming a $\times 2.2$ speedup of A100 vs V100 [@a100tov100][^6]. To assess sample quality, we additionally report FID scores on the reported datasets. We closely reach the performance of state of the art methods as StyleGAN2 [@DBLP:journals/corr/abs-1912-04958] and ADM [@DBLP:journals/corr/abs-2105-05233] while significantly reducing the required compute resources.

# Details on Autoencoder Models {#suppsec:ae}

We train all our autoencoder models in an adversarial manner following [@DBLP:journals/corr/abs-2012-09841], such that a patch-based discriminator $D_{\psi}$ is optimized to differentiate original images from reconstructions $\mathcal{D}(\mathcal{E}(x))$. To avoid arbitrarily scaled latent spaces, we regularize the latent $z$ to be zero centered and obtain small variance by introducing an regularizing loss term $L_{reg}$.\
We investigate two different regularization methods: (i) a low-weighted Kullback-Leibler-term between $q_{\mathcal{E}}(z \vert x) = \mathcal{N}(z; \mathcal{E}_\mu, \mathcal{E}_{\sigma^2})$ and a standard normal distribution $\mathcal{N}(z; 0, 1)$ as in a standard variational autoencoder [@VAE; @VAE2], and, (ii) regularizing the latent space with a vector quantization layer by learning a codebook of $\vert \mathcal{Z} \vert$ different exemplars [@DBLP:conf/nips/OordVK17].\
To obtain high-fidelity reconstructions we only use a very small regularization for both scenarios, we either weight the $\mathbb{KL}$ term by a factor $\sim 10^{-6}$ or choose a high codebook dimensionality $\vert \mathcal{Z} \vert$.

The full objective to train the autoencoding model $(\mathcal{E}, \mathcal{D})$ reads: $$\begin{equation}
L_{\text{Autoencoder}} =  \min_{\mathcal{E}, \mathcal{D}} \max_\psi \Big( L_{rec}(x, \mathcal{D}(\mathcal{E}(x))) - L_{adv}(\mathcal{D}(\mathcal{E}(x))) + \log D_{\psi}(x) + L_{reg}(x; \mathcal{E}, \mathcal{D}) \Big)
\label{eq:firststageloss}
\end{equation}$$

#### DM Training in Latent Space

Note that for training diffusion models on the learned latent space, we again distinguish two cases when learning $p(z)$ or $p(z\vert y)$ (Sec. [4.3](#subsec:conditionallatentdiffusion){reference-type="ref" reference="subsec:conditionallatentdiffusion"}): (i) For a KL-regularized latent space, we sample $z = \mathcal{E}_\mu(x) + \mathcal{E}_\sigma(x) \cdot \varepsilon =: \mathcal{E}(x)$, where $\varepsilon \sim \mathcal{N}(0, 1)$. When rescaling the latent, we estimate the component-wise variance $$\hat{\sigma}^2 = \frac{1}{b c h w}\sum_{b, c, h, w} (z^{b, c, h, w} - \hat{\mu})^2$$ from the first batch in the data, where $\hat{\mu} = \frac{1}{b c h w}\sum_{b, c, h, w} z^{b, c, h, w}$. The output of $\mathcal{E}$ is scaled such that the rescaled latent has unit standard deviation, $z \leftarrow \frac{z}{\hat{\sigma}} = \frac{\mathcal{E}(x)}{\hat{\sigma}}$. (ii) For a VQ-regularized latent space, we extract $z$ *before* the quantization layer and absorb the quantization operation into the decoder, it can be interpreted as the first layer of $\mathcal{D}$.

# Additional Qualitative Results

Finally, we provide additional qualitative results for our landscapes model (Fig. [12](#fig:landscapestune){reference-type="ref" reference="fig:landscapestune"}, [23](#fig:landscapestunewithmap){reference-type="ref" reference="fig:landscapestunewithmap"}, [24](#fig:thickersample){reference-type="ref" reference="fig:thickersample"} and [25](#fig:landscapes1){reference-type="ref" reference="fig:landscapes1"}), our class-conditional ImageNet model (Fig. [26](#fig:imagenet_samples_1){reference-type="ref" reference="fig:imagenet_samples_1"} - [27](#fig:imagenet_samples_2){reference-type="ref" reference="fig:imagenet_samples_2"}) and our unconditional models for the CelebA-HQ, FFHQ and LSUN datasets (Fig. [28](#fig:celeba_rsamples){reference-type="ref" reference="fig:celeba_rsamples"} - [31](#fig:beds_rsamples){reference-type="ref" reference="fig:beds_rsamples"}). Similar as for the inpainting model in Sec. [4.5](#subsec:inpainting){reference-type="ref" reference="subsec:inpainting"} we also fine-tuned the semantic landscapes model from Sec. [4.3.2](#subsubsec:beyond){reference-type="ref" reference="subsubsec:beyond"} directly on $512^2$ images and depict qualitative results in Fig. [12](#fig:landscapestune){reference-type="ref" reference="fig:landscapestune"} and Fig. [23](#fig:landscapestunewithmap){reference-type="ref" reference="fig:landscapestunewithmap"}. For our those models trained on comparably small datasets, we additionally show nearest neighbors in VGG [@simonyan2015VGG] feature space for samples from our models in Fig. [32](#fig:celeba_nns){reference-type="ref" reference="fig:celeba_nns"} - [34](#fig:churches_nns){reference-type="ref" reference="fig:churches_nns"}.

[^1]: The first two authors contributed equally to this work.

[^2]: This work has been supported by the German Federal Ministry for Economic Affairs and Energy within the project 'KI-Absicherung - Safe AI for automated driving' and by the German Research Foundation (DFG) project 421703927.

[^3]: It is not possible to exactly match both architectures since the diffusion model operates in the pixel space

[^4]: adapted from <https://github.com/lucidrains/x-transformers>

[^5]: <https://huggingface.co/transformers/model_doc/bert.html#berttokenizerfast>

[^6]: This factor corresponds to the speedup of the A100 over the V100 for a U-Net, as defined in Fig. 1 in  [@a100tov100]
