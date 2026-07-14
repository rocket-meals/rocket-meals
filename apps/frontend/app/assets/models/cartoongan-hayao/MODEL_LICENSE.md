# Model provenance & license — READ BEFORE SHIPPING TO PRODUCTION

This folder contains a CartoonGAN generator network ("hayao" style),
already converted to the modern TensorFlow.js `GraphModel` format
(`model.json` + `group1-shard*of3.bin`), so it can be loaded locally as a
bundled app asset without any conversion step (see `cartoonModel.ts` for
why we load it via a small custom asset loader instead of
`@tensorflow/tfjs-react-native`'s `bundleResourceIO` directly - short
version: `bundleResourceIO`'s local-file path depends on
`react-native-fs`, which doesn't work under Expo web).

## Where it comes from

- Original paper: Chen, Lai, Liu — *CartoonGAN: Generative Adversarial
  Networks for Photo Cartoonization* (CVPR 2018).
- TF2 re-implementation & pretrained weights: [mnicnc404/CartoonGan-tensorflow](https://github.com/mnicnc404/CartoonGan-tensorflow)
  (code is Apache-2.0, © 2019 Meng Lee & Ching Ning Chen).
- TFJS `GraphModel` conversion used here: [wangmengHB/local-tfjs-models](https://github.com/wangmengHB/local-tfjs-models),
  folder `cartoon-GAN/hayao`.

## ⚠️ License caveat — do not ship as-is without checking this

The **code** in `mnicnc404/CartoonGan-tensorflow` is Apache-2.0. The
**pretrained weights** it (and by extension `local-tfjs-models`) redistribute
trace back to the original CartoonGAN authors' released checkpoints, whose
own terms are not clearly stated as commercially licensed. The
`local-tfjs-models` repository itself carries no explicit license file and
its README notes other models in the same repo as "study usage only."

**Practical recommendation before this ships in the real rocket-meals app
(app stores, production builds):**

1. Treat this as a working *technical* proof of concept only, not
   production-cleared content.
2. Either (a) get written confirmation from the original authors / a
   commercially-licensed alternative, or (b) train your own CartoonGAN (or
   similar) model on your own/licensed images using the Apache-2.0 training
   code in `mnicnc404/CartoonGan-tensorflow`, or (c) switch to a model that
   is unambiguously commercially licensed (e.g. Google Magenta's
   Apache-2.0 "arbitrary image stylization" network — see conversion notes
   below, since Magenta's original checkpoints are in the old TFJS 0.x
   "frozen model" format and need re-conversion to the modern GraphModel
   format first).
3. Whichever model you end up with, keep a `MODEL_LICENSE.md` like this one
   next to it recording where it came from and under what terms.

## Size

`model.json` + 3 weight shards ≈ 11 MB total. See the PR description for how
this interacts with EAS Update's asset limits.

---

## How to convert your own model to TFJS `.json`/`.bin` format

If you have a different model (e.g. your own trained CartoonGAN, or another
style-transfer/GAN network) and need to get it into the format this
component expects, the general recipe is:

### 1. Install the converter (Python, one-time, only needed for conversion — not a runtime dependency of the app)

```bash
pip install tensorflowjs
```

### 2. Convert, depending on what you start with

**From a Keras `.h5` model:**

```bash
tensorflowjs_converter --input_format=keras \
    my_model.h5 \
    ./output_dir
```

**From a TensorFlow `SavedModel` directory (most common for TF2 GAN repos
like CartoonGan-tensorflow):**

```bash
tensorflowjs_converter --input_format=tf_saved_model \
    --output_format=tfjs_graph_model \
    --signature_name=serving_default \
    --saved_model_tags=serve \
    ./saved_model_dir \
    ./output_dir
```

**From an old TF1 frozen graph (`.pb` + node names), e.g. the legacy Magenta
checkpoints:**

```bash
tensorflowjs_converter --input_format=tf_frozen_model \
    --output_format=tfjs_graph_model \
    --output_node_names='OUTPUT_NODE_NAME' \
    frozen_graph.pb \
    ./output_dir
```

Each of these produces exactly what this app needs: one `model.json` file
plus one or more `group1-shardXofY.bin` weight files in `./output_dir`.

### 3. Drop the files into the app and wire them up

1. Copy `model.json` and every `group1-shard*` file into
   `apps/frontend/app/assets/models/<your-model-name>/`.
2. Rename each shard file to end in `.bin` if it doesn't already
   (`group1-shard1of2` → `group1-shard1of2.bin`) and update the `paths`
   array inside `model.json`'s `weightsManifest` to match — Metro (the RN/
   Expo bundler) only picks up binary assets by recognized extension, and
   `.bin` is what's registered in `metro.config.js` (`resolver.assetExts`).
3. Point `cartoonModel.ts`'s `require(...)` calls at the new folder.
4. If your model's expected input/output normalization differs from
   CartoonGAN's BGR / `[-1, 1]` convention (see comments in
   `cartoonModel.ts`), adjust `cartoonifyImage()`'s pre-/post-processing
   accordingly — check the original model's inference example for the exact
   formula.

### 4. Sanity-check before bundling

Load the converted `model.json` with `tf.loadGraphModel()` in a quick Node
or browser script and run one prediction on a small dummy tensor to confirm
the input/output shapes match what you expect, before wiring it into the RN
app.
