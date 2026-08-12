
HotCRP Helper is a browser extension, compliant with Manifest V3, for Chromium-based browsers that augments the webpages referring to specific submissions (i.e., "papers") on HotCRP. It is particularly addressed to "chairs" of scientific venues whose peer-review phase is managed via HotCRP instances, but it can also support vice/area/track chairs, as well as individual PC members. 

At a high level, it adds at-a-glance review word counts, discussion statistics, per-reviewer post-rebuttal participation and last activity, one-click email links, configurable comment visibility and thread defaults, and normalized rebuttal word counts. It also provides optional rule-based R1 recommendations, as well as counters of specific keywords/symbols oftentimes associated to LLMs writing.

## Overview

The extension runs locally in the browser and is intrinsically lightweight. The code in ```content.js``` parses the rendered HotCRP page and injects derived information into it. User preferences are stored through ```chrome.storage.sync```.

The codebase uses plain JavaScript and HTML with no build step:
* ```manifest.json``` defines supported HotCRP instances, 
*  ```popup.html``` and ```popup.js``` provide configuration, 
* ```content.js``` contains the parsing and presentation logic. 

Since HotCRP fields and markup vary across venues and releases, field identifiers may require adaptation. 

Additional instructions and descriptions on how to use the extensions are provided in the following document https://docs.google.com/presentation/d/1_Ly7ZjxoRYtMvdnjbljXEb6YxkXEAA4y/edit?usp=sharing&ouid=111520430254027932974&rtpof=true&sd=true




## Demo

![HotCRP Helper in action](hotcrp-helper-demo.gif)

(Note: do not try to infer confidential information from this GIF. I deliberately “faked” everything to prevent any sort of deanonymization.)

## Frequently Asked Questions

Click on the question to see the answer.

<details>
<summary><strong><i>How do I install the extension?</i></strong></summary>

Detailed instructions are [here](https://docs.google.com/presentation/d/1_Ly7ZjxoRYtMvdnjbljXEb6YxkXEAA4y/edit?slide=id.p19#slide=id.p19) (slide #21). At a high level:

1. Download and extract the extension.
2. Open `chrome://extensions`.
3. Enable **Developer mode**.
4. Click **Load unpacked**.
5. Select the extracted folder.

</details>

<details>
<summary><strong><i>Does the extension transmit review data?</i></strong></summary>

No. The extension processes the rendered HotCRP page locally in your browser and does not send submission or review content to any remote endpoint.

</details>

<details>
<summary><strong><i>How can I add another HotCRP venue?</i></strong></summary>

Add the venue’s URL pattern to the `matches` list in `manifest.json` (see [page#26 of the documentation](https://docs.google.com/presentation/d/1_Ly7ZjxoRYtMvdnjbljXEb6YxkXEAA4y/edit?slide=id.p24#slide=id.p24)) You may also need to update the field identifiers or selectors in `content.js` if that HotCRP instance uses a customized review form (see [page #30 of the documentation](https://docs.google.com/presentation/d/1_Ly7ZjxoRYtMvdnjbljXEb6YxkXEAA4y/edit?slide=id.p28#slide=id.p28))

</details>

<details>
<summary><strong><i>The extension does not load anymore. What to do?</i></strong></summary>
The extension must be manually loaded _for each Web Browser_ you use. For example, if you have two laptops, you must install it manually on both of them. 
Alternatively, it could also be that you have accidentally deleted, or moved, the folder in which you saved the extension on your local drive.
</details>

<details>
<summary><strong><i>Some wordcounts do not work anymore. What to do?</i></strong></summary>
This can happen as a result to updates to the HotCRP underlying's source code. If you know what to do, you can attempt to modify the code of the extension yourself; otherwise, drop me an email and I will investigate it.
</details>

<details>
<summary><strong><i>There is a bug. What to do?</i></strong></summary>
Drop me an email and explain the bug.
</details>

<details>
<summary><strong><i>Will you support other browsers (e.g., Firefox)?</i></strong></summary>
No. But I believe that modern LLMs can greatly help in "porting" the extension to Firefox. 

(To be frank, I initially planned on making a Firefox-compatible version of the extension; however, I found that "distributing" it was particularly cumbersome.) 
</details>

<details>
<summary><strong><i>I have a suggestion for a functionality. What to do?</i></strong></summary>
Feel free to reach out! Note, however, that the extension is meant to work by analysing _only_ the information shown on a given HotCRP's webpage. If your idea requires, e.g., making queries to remote endpoints, I may decide not to implement it as it would tamper with the extension's underlying principles. (But you're free to implement it yourself---potentially by forking this repository!) 
</details>

## Contact and Credit

For any questions, contact giovannia@ru.is

The extension was developed by Giovanni Apruzzese (with substantial support from ChatGPT :3), and the latest version integrates suggestions/feedback received by various researchers---particularly, the USENIX Security '26 (vice) PC co-Chairs, as well as Fabio Pierazzi and Konrad Rieck. 