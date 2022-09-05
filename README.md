一。通过 scripts 下的 create_table.js 创建需要的表 ✓
二。找到金狗项目，再 etherscan 下载 public mint 时间段的 csv 文件，放到 inputs/transactions 目录下，文件名用 collection name。✓
三。执行 node catch_smart_addr.js --collection={collection name}，将聪明地址解析入库。✓
四。执行 node cal_addr_flips_jpegcash.js 使用 jpeg.cash 的规则评估一个 address 的盈利情况 🚗
五。执行 node monit_winner_addr.js 来获取和监听最优的 5 个地址的下一次 mint 操作，决定是否跟单

其他说明：

-   filps.watch.etherscan.keys.js 里面存放的是 flips.watch 这个平台在 etherscan 注册的 API KEY，省的我们自己去注册了。
-   jpeg.cash.js 是 jpeg.catch 评估账号盈利情况的规则，目前是明文，我们直接复用了逻辑，同时也用于对比后续其逻辑是否修改。

后续改进：

-   使用 chrome.driver 模拟用户访问 jpeg.cash 和 flips.watch 的结果，
-   使用代理 IP
-   轮询使用 flips.watch 的 API-KEY
-   通过 os 或其他二级市场的平台，搭建自己的 collection_addr => floor_price 的 map，取代使用 jpeg.cash 的, 避免多次调用被封 IP
-   增加一个定时器，定时更新 jpeg.cash 的 spam

-- addressA mint 了 NFT，然后转给 addressB，jc 里面算亏了 gas 费的 close 交易，fw 里面不计入统计
-- addressA mint 了 NFT，然后 stake 了，jc 里面算亏了 gas 费的 close 交易
