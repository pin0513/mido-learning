import { test, expect } from "@playwright/test";

/**
 * 不帶 KP_INCLUDE_DRAFTS 的 build，並以 KP_ENABLED=true 啟動。
 * E2E_PUBLISHED_COUNT 是這份內容裡 status: published 的筆數。
 */
// B19 發布專案管理 sh 5 點後，原本的 sh 草稿樣本（衝突、敏捷、要徑、利害關係人）改用仍是草稿的 uni 與哲學點。
// B20 發布專案管理 uni 5 點後，專案管理 24 點全部發布，草稿樣本只剩哲學點（pm uni 5 點的 links 連到的 ph.applied、ph.epistem、ph.complex、ph.aimind 都還是草稿）。
// B21 發布哲學 es 5 點後，ph.parts@es 改用它的下一階草稿 ph.feedback@jh；B22 發布哲學 jh 6 點後，改用仍是草稿的 ph.science@sh。
// B23 發布哲學 sh 7 點後，4 個 sh 標題改用仍是草稿的 ph.philsci@uni、ph.formal@uni，以及軟實力草稿 sk.issuetree@jh（pm.breakdown@es 的被依賴）、sk.hypo@uni（ph.bias@sh 的被依賴）。
// B24 發布哲學 uni 6 點後，四個公開學門都沒有草稿；6 個哲學標題改用仍是草稿的軟實力點，跟 sk.issuetree、sk.hypo 一樣接在已發布點上：
// sk.decide@sh（先備 pm.triangle@jh）、sk.a3@uni（links.related pm.business@uni、ph.systems@sh）、sk.mediate@uni（先備 pm.conflict@sh）、sk.rootcause@sh（先備 ma.data@es）、sk.coach@uni（links.related pm.style@sh、pm.org@uni）、sk.problem@es（links.related pm.goal@es、ph.question@es）。
// 這個行程沒開溝通與解決問題旗標，所以這 8 筆同時因「草稿」與「旗標關閉」兩個原因不露出；只靠草稿這個原因的樣本已經沒有了（地圖的草稿匿名改在 city.test.ts 用合成內容查）。
// 旗標打開、只靠草稿過濾的那一輪在 kp-published-softskills.spec.ts（CI「Published-only pages, soft-skills on」）。
// B25 發布 sk.problem@es 後，改用仍是草稿的 sk.interview@sh（先備 ph.question@es）。
// B26 發布 sk.issuetree@jh 後，改用仍是草稿的 sk.feedback@sh（先備 pm.retro@es；zh.editing@uni 的 links 也連到它）。
// B27 發布軟實力高中 6 點後，草稿樣本只剩大學 4 點（sk.a3、sk.mediate、sk.hypo、sk.coach）；PM_PAGES 裡 sk.decide、sk.rootcause、sk.feedback、sk.interview、sk.design 的標題與網址留著，理由同下（各列註明）。
// 下面 PM_PAGES 裡 B26 發布的 sk.empmap、sk.nvc、sk.fishbone、sk.issuetree、sk.pdca 的標題與網址也留著，理由同下（各列註明）。
// 下面 PM_PAGES 裡 sk.problem、sk.otherside、sk.why5 的標題與網址留著：它們已發布，這個行程只因旗標關閉不露出（已發布的軟實力點在別學門頁上，旗標開時有連結，見 kp-published-softskills.spec.ts 第一則）。
const DRAFT_TITLES = [
  "一頁問題報告：帶團隊從問題到行動",
  "當調解人：幫兩方聽懂彼此",
  "假說驅動：先猜答案，再用資料檢驗",
  "教練式對話：用提問陪對方找答案",
];
// B17 發布的專案管理 es 5 點、B18 發布的 jh 5 點與 B19 發布的 sh 5 點：頁面 200，帶出已發布的相鄰點標題，不露出它們連到的草稿標題。
// B18 發布 pm.project、pm.team、pm.lead、pm.gantt、pm.risk 後，es 頁的下一階改成已發布標題。
// B19 發布 pm.stakeholder、pm.cpm、pm.conflict、pm.style、pm.agile 後，jh 頁的下一階也改成已發布標題；草稿只剩 ph.fair、ph.hypothesis、哲學 sh／uni 點與 uni 的專案管理點。
// B20 發布 uni 5 點後，sh 頁的下一階也改成已發布標題，並加上 uni 5 頁；各頁不露出的只剩它們連到的哲學草稿。
const PM_PAGES: [string, string[], string[]][] = [
  // B21 發布 ph.question@es、ph.fair@es 後，pm.goal@es、pm.roles@es 連過去的標題改成正向檢查，不露出的改用它們的下一階草稿；pm.sequence@es 改用 ph.parts@es 的下一階草稿。
  // B22 發布哲學 jh 6 點後，這三列不露出的改用仍是草稿的哲學 sh 點（ph.science、ph.ethicstheory、ph.systems，分別是 ph.hypothesis、ph.ethics、ph.feedback 的下一階）。
  // B23 發布哲學 sh 7 點後，這三列不露出的改用仍是草稿的哲學 uni 點（ph.philsci、ph.applied、ph.complex，分別是 ph.science、ph.ethicstheory、ph.systems 的下一階）。
  // B24 發布哲學 uni 6 點後，專案管理與哲學頁不露出的全部改用仍是草稿的軟實力點（有直接關係的用直接關係，沒有的用相鄰點的軟實力草稿，註在各列）；6 點出現在頁上的改成正向檢查。
  ["/kp/pm.goal/es", ["目標：我們想完成什麼？", "什麼是「專案」？", "好問題從「為什麼」開始"], ["問題是什麼？現在和想要"]], // sk.problem links.related；B25 起已發布，只因旗標關閉不露出
  ["/kp/pm.roles/es", ["分工與說到做到", "團隊溝通與會議", "領導是行為，不是職位", "怎樣才公平？"], ["換個位置想"]], // sk.otherside 連到 ph.fair@es；B25 起已發布，只因旗標關閉不露出
  ["/kp/pm.sequence/es", ["先做什麼、後做什麼", "甘特圖與里程碑"], ["問題樹：大問題拆成小問題"]], // sk.issuetree 的先備 pm.breakdown@es 也是這頁的先備；B26 起已發布，只因旗標關閉不露出
  ["/kp/pm.planb/es", ["如果下雨怎麼辦？", "風險：可能性 × 影響"], ["選方案：準則、權重、取捨"]], // B27 起 sk.decide 已發布，只因旗標關閉不露出
  // B22 發布 ph.hypothesis@jh 後，pm.retro@es、pm.agile@sh 的 links.related 帶出它的標題，改成正向檢查；不露出的改用它的下一階草稿 ph.science@sh。
  // B23 發布 ph.science@sh 後，不露出的改用它的下一階草稿 ph.philsci@uni；下面 jh／sh／uni 各列的 sh 標題也同樣改成它們的下一階 uni 草稿。
  // B24 發布 ph.philsci@uni 後，pm.retro@es 改用 links.related 連到它的軟實力草稿 sk.feedback@sh。
  ["/kp/pm.retro/es", ["回顧：哪裡好、哪裡可以更好", "團隊溝通與會議", "假設與實驗：把問題變成可以檢驗的"], ["給回饋，也收回饋"]], // B27 起 sk.feedback 已發布，只因旗標關閉不露出
  ["/kp/pm.project/jh", ["什麼是「專案」？", "目標：我們想完成什麼？", "利害關係人"], ["選方案：準則、權重、取捨"]], // 下一階 pm.triangle@jh 是 sk.decide 的先備；B27 起 sk.decide 已發布，只因旗標關閉不露出
  ["/kp/pm.gantt/jh", ["甘特圖與里程碑", "先做什麼、後做什麼", "要徑：決定專案長度的那條路"], ["問題樹：大問題拆成小問題"]], // B26 起 sk.issuetree 已發布，只因旗標關閉不露出
  ["/kp/pm.team/jh", ["團隊溝通與會議", "分工與說到做到", "領導是行為，不是職位", "衝突與協商", "利害關係人"], ["當調解人：幫兩方聽懂彼此"]], // 下一階 pm.conflict@sh 是 sk.mediate 的先備
  ["/kp/pm.lead/jh", ["領導是行為，不是職位", "團隊溝通與會議", "情境領導"], ["教練式對話：用提問陪對方找答案"]], // 下一階 pm.style@sh 由 sk.coach 連過去
  ["/kp/pm.risk/jh", ["風險：可能性 × 影響", "如果下雨怎麼辦？"], ["選方案：準則、權重、取捨"]], // B27 起 sk.decide 已發布，只因旗標關閉不露出
  // B23 發布 ph.systems@sh、ph.ethicstheory@sh 後，pm.stakeholder@sh 的 links.related、pm.conflict@sh 的 links.why 帶出它們的標題，改成正向檢查。
  ["/kp/pm.stakeholder/sh", ["利害關係人", "什麼是「專案」？", "團隊溝通與會議", "商業論證與專案治理", "系統思考：槓桿點與非預期後果"], ["同理心地圖：說、想、做、感受", "一頁問題報告：帶團隊從問題到行動"]], // sk.empmap links.related（B26 起已發布，只因旗標關閉不露出）；sk.a3 連到下一階 pm.business@uni
  ["/kp/pm.cpm/sh", ["要徑：決定專案長度的那條路", "甘特圖與里程碑", "WBS 與三點估算", "排程與資源最佳化"], ["選方案：準則、權重、取捨"]], // B27 起 sk.decide 已發布，只因旗標關閉不露出
  ["/kp/pm.conflict/sh", ["衝突與協商", "團隊溝通與會議", "利害關係人", "組織行為與心理安全感", "倫理學的三種視角"], ["當調解人：幫兩方聽懂彼此"]], // sk.mediate 的先備
  ["/kp/pm.style/sh", ["情境領導", "領導是行為，不是職位", "組織行為與心理安全感"], ["教練式對話：用提問陪對方找答案"]], // sk.coach links.related
  ["/kp/pm.agile/sh", ["敏捷與迭代", "回顧：哪裡好、哪裡可以更好", "甘特圖與里程碑", "複雜性與不確定性", "假設與實驗：把問題變成可以檢驗的"], ["設計思考：從同理到原型", "PDCA：計畫、執行、檢查、改進"]], // 兩者 links.related；B26 起 sk.pdca 已發布，只因旗標關閉不露出；B27 起 sk.design 已發布，只因旗標關閉不露出
  ["/kp/pm.business/uni", ["商業論證與專案治理", "利害關係人", "時間、金錢、品質的取捨", "決策、倫理與 AI 協作", "應用倫理：科技、商業與專業責任", "/kp/ph.applied/uni"], ["一頁問題報告：帶團隊從問題到行動", "/kp/sk.a3/uni"]], // B24：links.why 的 ph.applied@uni 已發布；sk.a3 links.related
  ["/kp/pm.schedule/uni", ["排程與資源最佳化", "要徑：決定專案長度的那條路", "WBS 與三點估算", "實獲值管理（EVM）"], ["選方案：準則、權重、取捨"]], // B27 起 sk.decide 已發布，只因旗標關閉不露出
  ["/kp/pm.org/uni", ["組織行為與心理安全感", "衝突與協商", "情境領導"], ["教練式對話：用提問陪對方找答案"]], // sk.coach links.related
  ["/kp/pm.complexity/uni", ["複雜性與不確定性", "敏捷與迭代", "風險：可能性 × 影響", "決策、倫理與 AI 協作", "知識論與不確定性", "/kp/ph.epistem/uni", "複雜性思維與模型的限度", "/kp/ph.complex/uni"], ["一頁問題報告：帶團隊從問題到行動", "選方案：準則、權重、取捨"]], // B24：ph.epistem、ph.complex 已發布；B27 起 sk.decide 已發布，只因旗標關閉不露出
  ["/kp/pm.aiteam/uni", ["決策、倫理與 AI 協作", "商業論證與專案治理", "複雜性與不確定性", "AI 時代的思考：人機分工與判斷", "/kp/ph.aimind/uni"], ["一頁問題報告：帶團隊從問題到行動", "教練式對話：用提問陪對方找答案"]], // B24：ph.aimind 已發布
  // B21 發布的哲學 es 5 點：頁面 200，帶出已發布的相鄰點標題（links.how／related、先備、被依賴），不露出 links.deeper 連到的 jh 草稿標題。
  // B22 發布哲學 jh 6 點後，es 5 頁的下一階（links.deeper）與被依賴改成正向檢查；不露出的改用仍是草稿、由它們連過去的軟實力點（sk.interview@sh、sk.nvc@jh、sk.fishbone@jh 是被依賴），以及下一階的下一階 ph.tok@sh、ph.ethicstheory@sh。
  ["/kp/ph.question/es", ["好問題從「為什麼」開始", "部分與整體", "假設與實驗：把問題變成可以檢驗的"], ["同理訪談：問開放式問題"]], // B27 起 sk.interview 已發布，只因旗標關閉不露出
  ["/kp/ph.fact/es", ["事實還是意見？", "我怎麼知道的？", "常見的推理謬誤", "證據與來源"], ["非暴力溝通：觀察、感受、需要、請求"]], // B26 起 sk.nvc 已發布，只因旗標關閉不露出
  // B23 發布 ph.tok@sh、ph.ethicstheory@sh 後，改用它們的下一階草稿 ph.epistem@uni、ph.applied@uni。主線共學卡只寫出 sh 標題與 ph.aimind@uni 的標題，uni 草稿（ph.aimind 以外）改回查標題，ph.fair@es 同時查網址。
  ["/kp/ph.know/es", ["我怎麼知道的？", "事實還是意見？", "證據與來源", "假設與實驗：把問題變成可以檢驗的"], ["PDCA：計畫、執行、檢查、改進"]], // B24：ph.hypothesis@jh 是 sk.pdca 的先備；B26 起 sk.pdca 已發布，只因旗標關閉不露出
  ["/kp/ph.fair/es", ["怎樣才公平？", "分工與說到做到", "兩難與價值衝突"], ["換個位置想", "/kp/sk.otherside/es"]], // B24：sk.otherside links.related；B25 起已發布，只因旗標關閉不露出
  ["/kp/ph.parts/es", ["部分與整體", "大事拆成小事", "好問題從「為什麼」開始", "因果鏈與回饋迴圈"], ["魚骨圖：把原因分類找"]], // B26 起 sk.fishbone 已發布，只因旗標關閉不露出
  // B22 發布的哲學 jh 6 點：帶出已發布的先備、同學門「把這裡當先備」與 links.related 標題，不露出 links.deeper 連到的 sh 草稿與仍是草稿的被依賴（sk.pdca@jh）。主線共學卡本來就寫出大人讀的標題，所以同一條主線上的 sh 草稿改查不連到草稿頁網址。
  // B23 發布哲學 sh 7 點後，jh 6 頁的下一階（links.deeper）與被依賴改成正向檢查（標題與連結網址）；不露出的改查下一階的下一階 uni 草稿的標題與網址。主線共學卡會寫出 ph.aimind@uni 的標題（ph.ai 路線），所以它只查網址；ph.hypothesis@jh 的 sk.pdca@jh 照舊。
  // B24 發布哲學 uni 6 點後，jh 6 頁不露出的改查相鄰的軟實力草稿標題與網址（uni 點不在 jh 頁上，不改成正向）。
  ["/kp/ph.argument/jh", ["論證的結構：前提與結論", "說出理由：「因為……所以……」", "常見的推理謬誤", "演繹、歸納與溯因", "/kp/ph.logic/sh"], ["問五次為什麼", "/kp/sk.why5/es"]], // 先備 ph.reason@es 是 sk.why5 的先備；B25 起已發布，只因旗標關閉不露出
  ["/kp/ph.fallacy/jh", ["常見的推理謬誤", "論證的結構：前提與結論", "認知偏誤與思考盲點", "/kp/ph.bias/sh"], ["假說驅動：先猜答案，再用資料檢驗", "/kp/sk.hypo/uni"]], // 下一階 ph.bias@sh 是 sk.hypo 的先備
  ["/kp/ph.evidence/jh", ["證據與來源", "事實還是意見？", "我怎麼知道的？", "生成式 AI 與媒體素養", "知識論：我們怎麼知道我們知道？", "判斷 AI 的回答"], ["用資料找真正原因", "/kp/sk.rootcause/sh", "/kp/sk.hypo/uni"]], // B27 起 sk.rootcause 已發布，只因旗標關閉不露出
  ["/kp/ph.feedback/jh", ["因果鏈與回饋迴圈", "部分與整體", "系統思考：槓桿點與非預期後果", "/kp/ph.systems/sh"], ["魚骨圖：把原因分類找", "/kp/sk.fishbone/jh"]], // sk.fishbone links.related；B26 起已發布，只因旗標關閉不露出
  ["/kp/ph.hypothesis/jh", ["假設與實驗：把問題變成可以檢驗的", "好問題從「為什麼」開始", "我怎麼知道的？", "科學哲學：可檢驗與會修正", "知識論：我們怎麼知道我們知道？"], ["假說驅動：先猜答案，再用資料檢驗", "/kp/sk.hypo/uni", "設計思考：從同理到原型", "/kp/sk.design/sh", "PDCA：計畫、執行、檢查、改進"]], // sk.pdca 的先備（B26 起已發布，只因旗標關閉不露出）；sk.design 是它的下一階；B27 起 sk.design 已發布，只因旗標關閉不露出
  ["/kp/ph.ethics/jh", ["兩難與價值衝突", "怎樣才公平？", "說出理由：「因為……所以……」", "倫理學的三種視角", "/kp/ph.ethicstheory/sh"], ["選方案：準則、權重、取捨", "/kp/sk.decide/sh"]], // sk.decide links.related；B27 起 sk.decide 已發布，只因旗標關閉不露出
  // B23 發布的哲學 sh 7 點：帶出已發布的先備與被依賴標題，不露出 links.deeper 連到的 uni 草稿標題與網址（ph.aimind@uni 的標題主線共學卡本來就寫出，只查網址），也不露出仍是草稿的被依賴（ph.bias@sh 的 sk.hypo@uni）。
  // B24 發布哲學 uni 6 點後，sh 7 頁的下一階（links.deeper）改成正向檢查（標題與網址）；不露出的改用相鄰的軟實力草稿。
  ["/kp/ph.logic/sh", ["演繹、歸納與溯因", "論證的結構：前提與結論", "形式邏輯與論證分析", "/kp/ph.formal/uni"], ["假說驅動：先猜答案，再用資料檢驗", "/kp/sk.hypo/uni"]],
  ["/kp/ph.science/sh", ["科學哲學：可檢驗與會修正", "假設與實驗：把問題變成可以檢驗的", "研究設計與科學方法的限制", "/kp/ph.philsci/uni"], ["假說驅動：先猜答案，再用資料檢驗", "/kp/sk.hypo/uni"]], // sk.hypo links.why
  ["/kp/ph.tok/sh", ["知識論：我們怎麼知道我們知道？", "證據與來源", "假設與實驗：把問題變成可以檢驗的", "知識論與不確定性", "/kp/ph.epistem/uni"], ["用資料找真正原因", "/kp/sk.rootcause/sh"]], // B27 起 sk.rootcause 已發布，只因旗標關閉不露出
  ["/kp/ph.bias/sh", ["認知偏誤與思考盲點", "常見的推理謬誤", "判斷 AI 的回答", "研究設計與科學方法的限制", "/kp/ph.philsci/uni"], ["假說驅動：先猜答案，再用資料檢驗", "/kp/sk.hypo/uni", "用資料找真正原因"]], // sk.hypo 的先備；B27 起 sk.rootcause 已發布，只因旗標關閉不露出
  ["/kp/ph.aijudge/sh", ["判斷 AI 的回答", "證據與來源", "認知偏誤與思考盲點", "AI 時代的思考：人機分工與判斷", "/kp/ph.aimind/uni"], ["/kp/sk.hypo/uni"]],
  ["/kp/ph.systems/sh", ["系統思考：槓桿點與非預期後果", "因果鏈與回饋迴圈", "利害關係人", "複雜性思維與模型的限度", "/kp/ph.complex/uni"], ["一頁問題報告：帶團隊從問題到行動", "/kp/sk.a3/uni"]], // sk.a3 links.related
  ["/kp/ph.ethicstheory/sh", ["倫理學的三種視角", "兩難與價值衝突", "應用倫理：科技、商業與專業責任", "/kp/ph.applied/uni"], ["選方案：準則、權重、取捨", "/kp/sk.decide/sh"]], // B27 起 sk.decide 已發布，只因旗標關閉不露出
  // B24 發布的哲學 uni 6 點：頁面 200，帶出已發布的先備、被依賴與 links 標題；不露出相鄰的軟實力草稿標題與網址。
  ["/kp/ph.epistem/uni", ["知識論與不確定性", "知識論：我們怎麼知道我們知道？", "機率模型與不確定性", "複雜性與不確定性", "AI 時代的思考：人機分工與判斷"], ["假說驅動：先猜答案，再用資料檢驗", "/kp/sk.hypo/uni"]],
  ["/kp/ph.philsci/uni", ["研究設計與科學方法的限制", "科學哲學：可檢驗與會修正", "認知偏誤與思考盲點", "統計推論：用機率檢核說法", "事實還是意見？"], ["假說驅動：先猜答案，再用資料檢驗", "/kp/sk.hypo/uni"]], // sk.hypo links.related
  ["/kp/ph.formal/uni", ["形式邏輯與論證分析", "演繹、歸納與溯因", "證明與數學歸納法", "程式設計：變數、迴圈、函式"], ["問五次為什麼", "/kp/sk.why5/es"]], // B25 起 sk.why5 已發布，只因旗標關閉不露出
  ["/kp/ph.applied/uni", ["應用倫理：科技、商業與專業責任", "倫理學的三種視角", "怎樣才公平？", "商業論證與專案治理", "決策、倫理與 AI 協作", "AI 安全、治理與法規"], ["選方案：準則、權重、取捨", "/kp/sk.decide/sh"]], // B27 起 sk.decide 已發布，只因旗標關閉不露出
  ["/kp/ph.complex/uni", ["複雜性思維與模型的限度", "系統思考：槓桿點與非預期後果", "部分與整體", "複雜性與不確定性", "微分方程與數學建模"], ["一頁問題報告：帶團隊從問題到行動", "/kp/sk.a3/uni"]],
  ["/kp/ph.aimind/uni", ["AI 時代的思考：人機分工與判斷", "知識論與不確定性", "判斷 AI 的回答", "我怎麼知道的？", "決策、倫理與 AI 協作", "以人為本的人機協作"], ["教練式對話：用提問陪對方找答案", "/kp/sk.coach/uni"]],
];
// B11 已發布「規律與關係」（ma.pattern）、「用字母代表數：方程式」（ma.algebra）、ma.measure；B12 已發布高中數學 7 點（ma.function、ma.trig、ma.rate 等）；B13 已發布大學數學 7 點（ma.limit、ma.derivative、ma.linalg 等）。B16 已發布大學資訊與 AI 6 點（it.nn、it.swe、it.aisys 等），草稿樣本改用仍是草稿、接在 pm.breakdown／pm.estimate／pm.triangle 之後的專案管理點（pm.cpm、pm.business）；B17 已發布專案管理 es 5 點（pm.goal、pm.roles、pm.sequence、pm.planb、pm.retro）；B18 再發布 jh 5 點（pm.project、pm.gantt、pm.team、pm.lead、pm.risk），草稿樣本與 404 頁改用再下一階的 sh／uni 草稿（pm.stakeholder、pm.conflict、pm.agile、pm.complexity）；B19 再發布 sh 5 點（pm.stakeholder、pm.cpm、pm.conflict、pm.style、pm.agile），草稿樣本與 404 頁改用 uni 與哲學草稿（pm.business、pm.org、pm.complexity、ph.systems、ph.ethicstheory）；已發布的 it.aisys、it.governance、it.hcai 分別連到草稿 pm.aiteam@uni、pm.business@uni、ph.aimind@uni，地圖不能露出它們的 slug。B20 再發布 uni 5 點（pm.business、pm.schedule、pm.org、pm.complexity、pm.aiteam），專案管理 24 點全部發布，草稿樣本與 404 頁改用哲學草稿（ph.applied、ph.epistem、ph.complex、ph.aimind、ph.systems、ph.ethicstheory、ph.parts）。

test.describe("正式 build", () => {
  test("index 只有已發布，草稿頁 404，已發布頁不含草稿標題", async ({ request }) => {
    const expected = Number(process.env.E2E_PUBLISHED_COUNT ?? "0");
    const index = await request.get("/kp/index.json");
    expect(index.status()).toBe(200);
    const rows = (await index.json()) as unknown[];
    expect(rows).toHaveLength(expected);

    // B19 發布 pm.stakeholder@sh 後，404 頁改用它的下一階草稿 pm.business@uni；B20 發布 pm.business@uni 後，404 頁改用它 links.why 連到的哲學草稿 ph.applied@uni。
    // B24 發布 ph.applied@uni 後，404 頁改用 pm.business@uni links.related 連到的軟實力草稿 sk.a3@uni（這個行程也沒開溝通與解決問題旗標）；ph.applied@uni 改查 200 與標題。
    const a3 = await request.get("/kp/sk.a3/uni");
    expect(a3.status()).toBe(404);
    expect(await a3.text()).not.toContain("一頁問題報告：帶團隊從問題到行動");
    if (expected > 0) {
      const applied = await request.get("/kp/ph.applied/uni");
      expect(applied.status()).toBe(200);
      expect(await applied.text()).toContain("應用倫理：科技、商業與專業責任");
    }

    const breakdown = await request.get("/kp/pm.breakdown/es");
    const html = await breakdown.text();
    const rsc = await request.get("/kp/pm.breakdown/es", {
      headers: { RSC: "1", Accept: "text/x-component" },
    });
    const flight = rsc.status() === 200 ? await rsc.text() : "";
    if (expected === 0) {
      expect(breakdown.status()).toBe(404);
      expect(html).not.toContain("大事拆成小事");
      return;
    }

    expect(breakdown.status()).toBe(200);
    expect(html).toContain("大事拆成小事");
    expect(html).toContain("目標：我們想完成什麼？");
    // B21 發布 ph.parts@es 後，pm.breakdown@es 的 links.why 帶出它的標題。
    expect(html).toContain("部分與整體");
    // B21 起 pm.breakdown@es 的連結都已發布；「尚未發布」只標示不帶標題，改看 ph.parts@es 連到的下一階草稿 ph.feedback@jh。
    // B22 發布 ph.feedback@jh 後，改看它連到的下一階草稿 ph.systems@sh。主線共學卡（paths/philosophy.yaml）本來就寫出大人讀的標題，所以這裡查的是不連到草稿頁。
    expect(html).not.toContain("尚未發布");
    const feedback = await (await request.get("/kp/ph.feedback/jh")).text();
    // B23 發布 ph.systems@sh 後，改看它連到的下一階草稿 ph.complex@uni；ph.feedback@jh 的連結都已發布，不再有「尚未發布」。
    expect(feedback).not.toContain("尚未發布");
    const systems = await (await request.get("/kp/ph.systems/sh")).text();
    // B24 發布 ph.complex@uni 後，ph.systems@sh 的連結都已發布：改成帶出它的標題與網址，不再有「尚未發布」。
    // 四個公開學門已沒有連到草稿的已發布點，「另有 N 個尚未發布」在這個行程沒有真實樣本（見 B24 README 的待決事項）。
    // 這則提示改由 kp-published-softskills.spec.ts（旗標開，樣本從內容算）與 components/kp/hidden-notice.test.ts（合成內容）查。
    expect(systems).not.toContain("尚未發布");
    expect(systems).toContain("/kp/ph.complex/uni");
    expect(systems).toContain("複雜性思維與模型的限度");
    for (const title of DRAFT_TITLES) {
      expect(html, title).not.toContain(title);
      expect(flight, title).not.toContain(title);
    }
    for (const [path, titles, drafts] of PM_PAGES) {
      const res = await request.get(path);
      expect(res.status(), path).toBe(200);
      const page = await res.text();
      for (const title of titles) expect(page, `${path} ${title}`).toContain(title);
      for (const draft of drafts) expect(page, `${path} ${draft}`).not.toContain(draft);
    }
  });

  test("地圖不放草稿標題，首頁畫出公開學門", async ({ request }) => {
    // B17：pm.goal、pm.schedule、pm.team 也是路線 id，國小一站發布後路線會顯示，不再當草稿 slug 檢查。
    // B18：pm.project、pm.gantt 已發布，改查仍是草稿的 pm.stakeholder、pm.conflict。
    // B19：pm.stakeholder、pm.cpm、pm.conflict 已發布，改查仍是草稿的 pm.org、pm.complexity、ph.systems（分別由 pm.conflict／pm.style、pm.agile、pm.stakeholder 連過去）。
    // B20：專案管理 24 點全部發布（pm.org 等也是路線 id），改查 pm uni 5 點連過去、仍是草稿的哲學點 ph.applied、ph.epistem、ph.complex、ph.aimind，以及 ph.parts、ph.systems、ph.ethicstheory。
    // B21：哲學 es 5 點發布後多顯示 6 條哲學路線，ph.systems、ph.epistemology 是路線 id（ph.epistem 是 ph.epistemology 的前綴），ph.parts 已發布，不再當草稿 slug 檢查；改查 es 5 點 links.deeper 連到、仍是草稿的 ph.feedback、ph.hypothesis、ph.evidence、ph.fallacy。
    // B22：ph.feedback、ph.hypothesis、ph.evidence、ph.fallacy 已發布，改查 jh 6 點 links.deeper 連到、仍是草稿的 ph.science、ph.tok、ph.bias、ph.aijudge。
    // B23：哲學 sh 7 點已發布，地圖上的草稿只剩哲學 uni 6 點。ph.epistem 是路線 id ph.epistemology 的前綴，所以用帶後綴的 ph.epistem@uni、ph.epistem/uni 與網址前綴 /kp/ph.epistem/ 查；其他 5 點查 slug 本身。8 筆都是地圖上真的可能出現的字串（第 2 輪獨立審查選改 10：原本 3 個 sk slug 恆為真，拿掉）。
    // B24：哲學 uni 6 點已發布，地圖上沒有草稿。這 8 筆改成正向檢查（6 點的網址與 id 都在地圖上）；草稿的匿名改在 city.test.ts 用合成內容查，這裡改查地圖上沒有 draft-。
    const slugs = ["/kp/ph.applied/uni", "/kp/ph.philsci/uni", "/kp/ph.formal/uni", "ph.epistem@uni", "/kp/ph.epistem/uni", "/kp/ph.complex/uni", "/kp/ph.aimind/uni", "ph.complex@uni"];
    const map = await request.get("/kp/map");
    expect(map.status()).toBe(200);
    const mapHtml = await map.text();
    const mapRsc = await request.get("/kp/map", { headers: { RSC: "1", Accept: "text/x-component" } });
    // B24 第 2 輪：先斷言 RSC 回 200，避免 mapFlight 是空字串時，下面的檢查變成空斷言。
    expect(mapRsc.status()).toBe(200);
    const mapFlight = await mapRsc.text();
    expect(mapFlight.length).toBeGreaterThan(0);
    for (const slug of slugs) {
      expect(mapHtml, slug).toContain(slug);
      expect(mapFlight, slug).toContain(slug);
    }
    expect(mapHtml).not.toContain("draft-");
    expect(mapFlight).not.toContain("draft-");
    // B23：哲學 uni 6 個草稿標題都不在地圖上（原本只查一個）。B24：6 點已發布，改成 6 個標題都在地圖上。
    for (const title of ["研究設計與科學方法的限制", "形式邏輯與論證分析", "知識論與不確定性", "複雜性思維與模型的限度", "應用倫理：科技、商業與專業責任", "AI 時代的思考：人機分工與判斷"]) expect(mapHtml, title).toContain(title);

    for (const path of ["/city-home", "/"]) {
      const page = await request.get(path);
      expect(page.status(), path).toBe(200);
      const html = await page.text();
      expect(html, path).toContain("先選學門，再從上往下看");
      expect(html, path).toContain("規律與關係");
      expect(html, path).toContain("ma.pattern");
      expect(html, path).toContain("分工與說到做到");
      expect(html, path).toContain("什麼是「專案」？");
      // B19 發布 pm.stakeholder@sh 後，首頁畫出它；B20 再畫出它的下一階 pm.business@uni。
      // 專案管理已沒有草稿；哲學圖本來就畫草稿（不在只畫已發布的圖裡），所以不露出的改用只畫已發布的軟實力圖裡仍是草稿的 sk.mediate@uni。
      expect(html, path).toContain("利害關係人");
      expect(html, path).toContain("商業論證與專案治理");
      expect(html, path).not.toContain("當調解人：幫兩方聽懂彼此");
      expect(html, path).not.toContain("draft-");
      expect(html, path).not.toContain("城市");
    }
  });
});
