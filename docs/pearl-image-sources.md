# 珍珠二级页实拍素材记录

检索及下载日期：2026-09-12。图片以 Commons 原图页面及 imageinfo API 的源描述为依据；已逐张打开检查。当前所有 5 张素材下载自 Commons 提供的 960 px 缩略版本，合计 705,146 bytes，放在 `miniprogram/packageEvents/assets/pearls/` 分包。没有 AI 重画、去水印、改变珠色或形态；渲染时 `aspectFill` 仅适配容器，点击可查看完整摄影构图。

网页内提供“影像来源”展开面板，可查看每张作者、许可及许可链接，并复制原图与授权链接。BY-SA 图片继续按各自 BY-SA 许可提供；此许可覆盖相应照片，不改变独立应用代码的许可。

| 文件 | 用途与证据 | 作者 / 署名 | 许可 | 原始尺寸 → 本地尺寸 | Bytes |
| --- | --- | --- | --- | --- | --- |
| freshwater-loose.jpg | 原图标题为 Freshwater pearl texturedloose，Commons 分类为 Freshwater pearls；说明为不同形状和尺寸的 Keshi pearls。仅展示异形淡水裸珠参考。 | Jennifergaglione | CC0 1.0 | 3008×2000 → 960×638 | 213053 |
| akoya-loose.jpg | 原图标题明确 Akoya pearls - black & white，描述直径 8.0 mm；一白一黑两颗裸珠。未注明处理方式，页面不宣称黑珠为天然黑色。 | Mauro Cateb | CC BY-SA 4.0 | 2603×1983 → 960×731 | 114098 |
| style-studs.jpg | Auckland Museum 9218 藏品摄影，选用 9218-2 中性灰背景机位，原图描述 Earrings, pair, pearl studs。保留原图藏品编号；仅表示耳钉结构灵感，不宣称照片物品为本店库存或特定珠种。 | Auckland Museum / 作者未署名 | CC BY 4.0 | 2592×1944 → 960×720 | 168626 |
| style-necklace.jpg | White Wedding，淡水珍珠多层项链，设计师明确开放该设计与照片。 | Ann-Sophie Qvarnström / W.carter | CC BY-SA 4.0 | 2500×1875 → 960×720 | 123212 |
| style-ring.jpg | Blue Moon，银托淡蓝色 Mabe 珍珠戒指，设计师明确开放该设计与照片。作为独立款式参考，不当作澳白、Akoya 或淡水珠实例。 | Ann-Sophie Qvarnström / W.carter | CC BY-SA 4.0 | 2500×1875 → 960×720 | 86157 |

## 来源与授权

- 淡水裸珠：[Commons 原图](https://commons.wikimedia.org/wiki/File:Freshwater_pearl_texturedloose.jpg)，[CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/)。
- Akoya 裸珠：[Commons 原图](https://commons.wikimedia.org/wiki/File:Akoya_pearls_-_black_%26_white.jpg)，[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)。
- 耳钉：[Commons 原图](https://commons.wikimedia.org/wiki/File:Earrings,_pair_(AM_9218-2).jpg)，[Auckland Museum 藏品](https://www.aucklandmuseum.com/collection/object/am_humanhistory-object-9218)，[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)。
- 项链：[Commons 原图](https://commons.wikimedia.org/wiki/File:White_Wedding_-_pearl_necklace.jpg)，[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)。
- 戒指：[Commons 原图](https://commons.wikimedia.org/wiki/File:Blue_Moon_-_silver_ring_with_large_Mabe-pearl.jpg)，[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)。

## SHA-256

```text
freshwater-loose.jpg 0727E5DA43DDEE6F38CA044F685D8466F5668041A3BE112B58FDB218A44FCFCE
akoya-loose.jpg BEFCF264C43BF454104C216D178CBB7182AAB03E12EBCD9BFF0A0FEC578FED10
style-studs.jpg F4A7D10FA03B8E672A0411C969A0C3FDE4F607D8F2D288D9607818AB9E2D6347
style-necklace.jpg CF20D863EB92DCC40C2C9159C6C28DEFE6F0604411E011FD8BAD25FB64CF7779
style-ring.jpg 777AABC03F96182468325961293F8C323290BAB5F715FFEAD67642A02D4F508F
```

## 明确的素材缺口

澳白裸珠实拍尚缺同时具有明确澳洲产地与允许使用许可的来源。Commons 的 [Circle south sea pearls](https://commons.wikimedia.org/wiki/File:Circle_south_sea_pearls.JPG) 明确写为印尼，因此未采用。开放论文 [DNA Fingerprinting of Pearls to Determine Their Origins](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0075606) 中的 P. maxima 样本混合澳洲、印尼、菲律宾来源，未借其中照片指认澳白。

澳白品类正常可选，第三卡片以“联系查看实拍”留白展示；选中后客服意向显示“澳白”。待运营方提供获许可且品类已确认的澳白原始照片，再补 `PEARL_CATEGORIES` 的 image 与署名记录，不能以其他南洋珠图片替代。

## 交互边界

客服按钮使用微信原生 `open-type="contact"`，仅发送珍珠品类上下文。会话是否可用取决于管理员后台客服配置、登录和平台环境；代码不会宣称已建立会话。`ABclub1` 作为可复制的负责人微信备选。页面只展示参考和选珠咨询，不提供价格、订单、支付或名片数据读取。
