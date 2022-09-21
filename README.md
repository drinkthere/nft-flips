一。通过 scripts 下的 create_table.js 创建需要的表 ✓
二。找到金狗项目，再 etherscan 下载 public mint 时间段的 csv 文件，放到 inputs/transactions 目录下，文件名用 collection name。✓
三。执行 node catch_smart_addr.js --collection={collection name} --method={method name}，将聪明地址解析入库。method name 是该 collection 的 mint 方法名。✓
四。执行 node cal_addr_flips_jpegcash.js 使用 jpeg.cash 的规则评估一个 address 的盈利情况 ✓
五。执行 node monit_winner_addr.js 来获取和监听最优的 5 个地址的下一次 mint 操作，决定是否跟单 ✓

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

scripts:
node catch_smart_addr.js --collection=digidaigaku --method='Mint Public';
node catch_smart_addr.js --collection=mutant-ape-yacht-club --method='Mint Mutants';
node catch_smart_addr.js --collection=boredapeyachtclub --method='Mint Ape';
node catch_smart_addr.js --collection=azuki --method='Auction Mint';
node catch_smart_addr.js --collection=proof-moonbirds --method='Mint PROOF';
node catch_smart_addr.js --collection=doodles-official --method='Mint Allow List|Mint';
node catch_smart_addr.js --collection=meebits --method='Mint With Punk Or Glyph|Mint';
node catch_smart_addr.js --collection=cool-cats-nft --method='Adopt';
node catch_smart_addr.js --collection=bored-ape-kennel-club --method='Adopt Dog|Adopt N Dogs';

API:
Get a list of 'ERC1155 - Token Transfer Events' by Address
https://docs.etherscan.io/api-endpoints/accounts#get-a-list-of-erc1155-token-transfer-events-by-address
https://api.etherscan.io/api
?module=account
&action=token1155tx
&contractaddress=0x76be3b62873462d2142405439777e971754e8e77
&address=0x83f564d180b58ad9a02a449105568189ee7de8cb
&page=1
&offset=100
&startblock=0
&endblock=99999999
&sort=asc
&apikey=YourApiKeyToken

Get a list of 'ERC721 - Token Transfer Events' by Address
https://docs.etherscan.io/api-endpoints/accounts#get-a-list-of-erc721-token-transfer-events-by-address
https://api.etherscan.io/api
?module=account
&action=tokennfttx
&contractaddress=0x06012c8cf97bead5deae237070f9587f8e7a266d
&address=0x6975be450864c02b4613023c2152ee0743572325
&page=1
&offset=100
&startblock=0
&endblock=27025780
&sort=asc
&apikey=YourApiKeyToken

Get a list of 'ERC20 - Token Transfer Events' by Address
https://docs.etherscan.io/api-endpoints/accounts#get-a-list-of-erc20-token-transfer-events-by-address
https://api.etherscan.io/api
?module=account
&action=tokentx
&contractaddress=0x9f8f72aa9304c8b593d555f12ef6589cc3a579a2
&address=0x4e83362442b8d1bec281594cea3050c8eb01311c
&page=1
&offset=100
&startblock=0
&endblock=27025780
&sort=asc
&apikey=YourApiKeyToken

Get "Internal Transactions" by Block Range
https://docs.etherscan.io/api-endpoints/accounts#get-internal-transactions-by-block-range
https://api.etherscan.io/api
?module=account
&action=txlist
&address=0xc5102fE9359FD9a28f877a67E36B0F050d81a3CC
&startblock=0
&endblock=99999999
&page=1
&offset=10
&sort=asc
&apikey=YourApiKeyToken

Get a list of 'Normal' Transactions By Address
https://docs.etherscan.io/api-endpoints/accounts#get-a-list-of-normal-transactions-by-address
https://api.etherscan.io/api
?module=account
&action=txlist
&address=0xc5102fE9359FD9a28f877a67E36B0F050d81a3CC
&startblock=0
&endblock=99999999
&page=1
&offset=10
&sort=asc
&apikey=YourApiKeyToken
