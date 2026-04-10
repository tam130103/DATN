# AI Deploy Checklist

## Muc tieu

Tai lieu nay chot quy trinh van hanh cho luong AI caption va hashtag khi he thong van giu Dify lam runtime.

## Source of truth

- Dify Cloud app dang publish la runtime source of truth.
- File mirror trong repo chi dung de version control va diff:
  - `dify/datn-caption-workflow-v2.yml`
- Neu production drift voi repo, uu tien sua workflow tren Dify Cloud truoc, sau do export/sync nguoc ve repo.

## Caption workflow defaults

- Flow giu nguyen `start -> llm -> end`.
- Khong them node moi trong pass hotfix.
- Target completion params:
  - `max_tokens`: `220-280`
  - `temperature`: `0.4-0.6`
  - `top_p`: `0.8-0.9`
- Prompt phai ep caption bam chu de, mo dau nhac truc tiep hoac dien dat sat chu de, va khong drift sang noi dung chung chung.

## Kiem tra runtime truoc deploy

1. Xac nhan backend dang dung dung `DIFY_CAPTION_WORKFLOW_KEY` va `DIFY_GENERAL_API_KEY`.
2. Goi Dify app `GET /info` de xac nhan app name/description.
3. Goi Dify app `GET /parameters` de xac nhan input vars va app mode.
4. Diff workflow cloud vua publish voi file mirror trong repo.
5. Publish workflow cloud truoc khi deploy backend.

Tai lieu tham khao:

- Dify workflow run API: [https://docs.dify.ai/api-reference/workflows/run-workflow](https://docs.dify.ai/api-reference/workflows/run-workflow)
- Dify workflow app info: [https://docs.dify.ai/api-reference/workflow-app-information/get-workflow-app-information](https://docs.dify.ai/api-reference/workflow-app-information/get-workflow-app-information)
- Dify workflow app parameters: [https://docs.dify.ai/api-reference/workflow-app-parameters/get-workflow-app-parameters](https://docs.dify.ai/api-reference/workflow-app-parameters/get-workflow-app-parameters)

## Deploy checklist

1. Sua workflow tren Dify Cloud.
2. Publish workflow.
3. Xac nhan app key van tro dung app.
4. Export/sync lai file YAML mirror trong repo.
5. Deploy backend.
6. Smoke test `POST /api/v1/posts/ai/generate-caption`.
7. Smoke test `POST /api/v1/posts/ai/suggest-hashtags`.
8. Test UI `Viet bang AI` va `Goi y hashtag` tren production.

## Acceptance checklist

- Caption response co `text` va `meta`.
- Hashtag response co `hashtags` va `meta`.
- `meta.degraded=true` khi backend dung fallback.
- Khong con log timeout `35000ms exceeded`.
- Khong con log `413 Request too large` o luong hashtag.

## Neu production van sai chu de

- Kiem tra lai workflow cloud da publish chua.
- Kiem tra `GET /parameters` co dung input `topic` va `tone` khong.
- Kiem tra app key co dang tro sang app cu khong.
- Chi sua file YAML local la khong du neu cloud workflow chua publish ban moi.
