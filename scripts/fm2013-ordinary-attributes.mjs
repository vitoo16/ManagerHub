// Isolated exact-build research metadata, derived from file-backed FMRTE13 CIL.
// Scale5 requires the reference configuration attributesRange=20; CA/PA mode does not select it.
// Source names retain FM2013 terminology; this is not the canonical product attribute schema.
export const FM2013_ORDINARY_ATTRIBUTES = Object.freeze([
  {
    "key": "aerialAbility",
    "name": "AerialAbility",
    "sourceName": "AerialAbility",
    "category": "goalkeeping",
    "offset": 59,
    "sourceGetterToken": "0x06000de0",
    "fieldToken": "0x04000364",
    "getterIlSha256": "7785f15d4fd00e64319c3e176be3d2ddcf2b77f69b885c0219befcfd78f04701"
  },
  {
    "key": "commandOfArea",
    "name": "CommandOfArea",
    "sourceName": "CommandOfArea",
    "category": "goalkeeping",
    "offset": 60,
    "sourceGetterToken": "0x06000de2",
    "fieldToken": "0x0400036a",
    "getterIlSha256": "779b2babbfe2c7750b05665fb9dedeb5fa784b0f8cd918310b5215fa95b03cb6"
  },
  {
    "key": "communication",
    "name": "Communication",
    "sourceName": "Communication",
    "category": "goalkeeping",
    "offset": 61,
    "sourceGetterToken": "0x06000de4",
    "fieldToken": "0x0400036b",
    "getterIlSha256": "69a7c567f423d96de964f42428158464ffa4a866b6d582f2e5420d36f5699088"
  },
  {
    "key": "eccentricity",
    "name": "Eccentricity",
    "sourceName": "Eccentricity",
    "category": "goalkeeping",
    "offset": 78,
    "sourceGetterToken": "0x06000de6",
    "fieldToken": "0x04000376",
    "getterIlSha256": "25fd8079707d81b0eb746e506169ae860c8a1641227a7f8c76f8642e23b0516b"
  },
  {
    "key": "handling",
    "name": "Handling",
    "sourceName": "Handling",
    "category": "goalkeeping",
    "offset": 58,
    "sourceGetterToken": "0x06000de8",
    "fieldToken": "0x0400037b",
    "getterIlSha256": "126aa152bbf1a61f696ece968af997ba5655c213ee19ca0b7bee9dbb4415f867"
  },
  {
    "key": "kicking",
    "name": "Kicking",
    "sourceName": "Kicking",
    "category": "goalkeeping",
    "offset": 62,
    "sourceGetterToken": "0x06000dea",
    "fieldToken": "0x04000381",
    "getterIlSha256": "b2b790cad0a25c102e96714f64612fa0d19b5b264275fcf17f88d64b03aa4a2f"
  },
  {
    "key": "oneOnOnes",
    "name": "OneOnOnes",
    "sourceName": "OneOnOnes",
    "category": "goalkeeping",
    "offset": 66,
    "sourceGetterToken": "0x06000dec",
    "fieldToken": "0x04000388",
    "getterIlSha256": "8228834301504c6c58e4ac6f40f4bbcc6a944a545adf9dc8e0d6e51b11f08581"
  },
  {
    "key": "reflexes",
    "name": "Reflexes",
    "sourceName": "Reflexes",
    "category": "goalkeeping",
    "offset": 68,
    "sourceGetterToken": "0x06000dee",
    "fieldToken": "0x0400038d",
    "getterIlSha256": "0cc32f3d1b35f50517dd9db3e3ca19eeaf11c93b010c4734ea767e7df0afba61"
  },
  {
    "key": "rushingOut",
    "name": "RushingOut",
    "sourceName": "RushingOut",
    "category": "goalkeeping",
    "offset": 79,
    "sourceGetterToken": "0x06000df0",
    "fieldToken": "0x0400038f",
    "getterIlSha256": "ed7e92cb4f74de74337617883cd00187f991a703576602446e5fdfd0fff52bb4"
  },
  {
    "key": "tendencyToPunch",
    "name": "TendencyToPunch",
    "sourceName": "TendencyToPunch",
    "category": "goalkeeping",
    "offset": 80,
    "sourceGetterToken": "0x06000df2",
    "fieldToken": "0x04000395",
    "getterIlSha256": "2cc2ef554d21c0c0007bdb0e6d6f3603bc9c50695adab5f946ecbc04f8ae45e9"
  },
  {
    "key": "throwing",
    "name": "Throwing",
    "sourceName": "Throwing",
    "category": "goalkeeping",
    "offset": 63,
    "sourceGetterToken": "0x06000df4",
    "fieldToken": "0x04000396",
    "getterIlSha256": "5ec918b28e9d791b1b001d931eb80cfd4e4395b0b5525130c555f1ba6339c9ac"
  },
  {
    "key": "aggression",
    "name": "Aggression",
    "sourceName": "Aggression",
    "category": "mental",
    "offset": 92,
    "sourceGetterToken": "0x06000ebc",
    "fieldToken": "0x04000365",
    "getterIlSha256": "dd98adbed97c943add9a561319159d2bfdee7e23c7fab00a47fab3f536905247"
  },
  {
    "key": "anticipation",
    "name": "Anticipation",
    "sourceName": "Anticipation",
    "category": "mental",
    "offset": 64,
    "sourceGetterToken": "0x06000ebe",
    "fieldToken": "0x04000367",
    "getterIlSha256": "4a1076a474c9e645c41d3a24deea0f2e2aaf2d492b25f9585eb9b87d4daf134a"
  },
  {
    "key": "bravery",
    "name": "Bravery",
    "sourceName": "Bravery",
    "category": "mental",
    "offset": 90,
    "sourceGetterToken": "0x06000ec0",
    "fieldToken": "0x04000369",
    "getterIlSha256": "926c710aec5c01764a754dd0aef2039e2310a79dcd02b817590a40229b6c4822"
  },
  {
    "key": "composure",
    "name": "Composure",
    "sourceName": "Composure",
    "category": "mental",
    "offset": 99,
    "sourceGetterToken": "0x06000ec2",
    "fieldToken": "0x0400036c",
    "getterIlSha256": "1c0607de833b6cfebbb220b09c4fdd0c656212c24bb5069ddd52477746dd1a35"
  },
  {
    "key": "concentration",
    "name": "Concentration",
    "sourceName": "Concentration",
    "category": "mental",
    "offset": 100,
    "sourceGetterToken": "0x06000ec4",
    "fieldToken": "0x0400036d",
    "getterIlSha256": "abeb2516e7b6f58f5d51f967c62ae55a39b59b1b9f0fd7076de4e54d7415d0eb"
  },
  {
    "key": "creativity",
    "name": "Creativity",
    "sourceName": "Creativity",
    "category": "mental",
    "offset": 57,
    "sourceGetterToken": "0x06000ec6",
    "fieldToken": "0x04000370",
    "getterIlSha256": "ff988c9f8621f9b08fcf747e5ab1e07202e511e4c181d3a317bd5d0fd920e6da"
  },
  {
    "key": "decisions",
    "name": "Decisions",
    "sourceName": "Decisions",
    "category": "mental",
    "offset": 65,
    "sourceGetterToken": "0x06000ec8",
    "fieldToken": "0x04000372",
    "getterIlSha256": "31810bcb625655d861bae185d6925f76933eef169f4386965506d8c8f49f85b0"
  },
  {
    "key": "determination",
    "name": "Determination",
    "sourceName": "Determination",
    "category": "mental",
    "offset": 98,
    "sourceGetterToken": "0x06000eca",
    "fieldToken": "0x04000373",
    "getterIlSha256": "45701448fbba08e3abeba1c0000809d7cba4cfa6a49438129693b95795400c40"
  },
  {
    "key": "flair",
    "name": "Flair",
    "sourceName": "Flair",
    "category": "mental",
    "offset": 73,
    "sourceGetterToken": "0x06000ecc",
    "fieldToken": "0x04000379",
    "getterIlSha256": "ab116c98459ff0f1907668143cef78b1e1bc1cc15760f8a05a95671ea05698ac"
  },
  {
    "key": "influence",
    "name": "Influence",
    "sourceName": "Influence",
    "category": "mental",
    "offset": 87,
    "sourceGetterToken": "0x06000ece",
    "fieldToken": "0x0400037e",
    "getterIlSha256": "52502cee4e39d1b2571de0c9d0980c1ea69fc8a390ef9058ef7598884c1cb9cb"
  },
  {
    "key": "offTheBall",
    "name": "OffTheBall",
    "sourceName": "OffTheBall",
    "category": "mental",
    "offset": 53,
    "sourceGetterToken": "0x06000ed0",
    "fieldToken": "0x04000387",
    "getterIlSha256": "3b3895f3075459f286a5da0538915b83486a37763073b15849319d38f25baf38"
  },
  {
    "key": "positioning",
    "name": "Positioning",
    "sourceName": "Positioning",
    "category": "mental",
    "offset": 67,
    "sourceGetterToken": "0x06000ed2",
    "fieldToken": "0x0400038c",
    "getterIlSha256": "bf0b682156e715f063da64a018c8a631c99d3c6aa7b92200e1534e0118a3a024"
  },
  {
    "key": "teamwork",
    "name": "Teamwork",
    "sourceName": "Teamwork",
    "category": "mental",
    "offset": 75,
    "sourceGetterToken": "0x06000ed4",
    "fieldToken": "0x04000393",
    "getterIlSha256": "f688dbbbc23ff0c5e2a121ea4d909bca10403e4f4b84217c57338d224daa185a"
  },
  {
    "key": "workrate",
    "name": "Workrate",
    "sourceName": "Workrate",
    "category": "mental",
    "offset": 76,
    "sourceGetterToken": "0x06000ed6",
    "fieldToken": "0x04000398",
    "getterIlSha256": "218b1e7156d607cb8471866a831c9fc8094b177db28d0a172cabfa68bf8bef03"
  },
  {
    "key": "acceleration",
    "name": "Acceleration",
    "sourceName": "Acceleration",
    "category": "physical",
    "offset": 81,
    "sourceGetterToken": "0x06000fb5",
    "fieldToken": "0x04000363",
    "getterIlSha256": "d981ce4652bebf2837f1d7fb9d085a1657daaeb313338aa32a244b9fdc09458d"
  },
  {
    "key": "agility",
    "name": "Agility",
    "sourceName": "Agility",
    "category": "physical",
    "offset": 93,
    "sourceGetterToken": "0x06000fb7",
    "fieldToken": "0x04000366",
    "getterIlSha256": "6fbd5e37271e8797261d159b1930ed32736fb440deeb47a93343d7042fed4ba5"
  },
  {
    "key": "balance",
    "name": "Balance",
    "sourceName": "Balance",
    "category": "physical",
    "offset": 89,
    "sourceGetterToken": "0x06000fb9",
    "fieldToken": "0x04000368",
    "getterIlSha256": "25ac18e0b94e969e3a7f11dcba6b7d39f6ff034740669f78fcefc355650cb2ca"
  },
  {
    "key": "jumping",
    "name": "Jumping",
    "sourceName": "Jumping",
    "category": "physical",
    "offset": 86,
    "sourceGetterToken": "0x06000fbb",
    "fieldToken": "0x04000380",
    "getterIlSha256": "0cb7337ffcc0192b8f50002371a91aac054a1e3817112d5856a81f5ed009ff44"
  },
  {
    "key": "leftFoot",
    "name": "LeftFoot",
    "sourceName": "LeftFoot",
    "category": "physical",
    "offset": 71,
    "sourceGetterToken": "0x06000fbd",
    "fieldToken": "0x04000382",
    "getterIlSha256": "92845acae36adcc9fc24fdf4c339c50bc99c2ff14d614067932c0efec9fb55c2"
  },
  {
    "key": "naturalFitness",
    "name": "NaturalFitness",
    "sourceName": "NaturalFitness",
    "category": "physical",
    "offset": 97,
    "sourceGetterToken": "0x06000fbf",
    "fieldToken": "0x04000386",
    "getterIlSha256": "84d0de7a8363a80aa41d0ab6a6639423da540f89e3f21b46f88957e3e9ae2075"
  },
  {
    "key": "pace",
    "name": "Pace",
    "sourceName": "Pace",
    "category": "physical",
    "offset": 85,
    "sourceGetterToken": "0x06000fc1",
    "fieldToken": "0x04000389",
    "getterIlSha256": "b52208f91a1f160e2c7411e13c790d28f81ad00357d63814aa84149cf0dd0289"
  },
  {
    "key": "rightFoot",
    "name": "RightFoot",
    "sourceName": "RightFoot",
    "category": "physical",
    "offset": 72,
    "sourceGetterToken": "0x06000fc3",
    "fieldToken": "0x0400038e",
    "getterIlSha256": "89d69cdf8f3da8a65c636cfd70217ae06cd61eb16288891ea77046926443f4a6"
  },
  {
    "key": "stamina",
    "name": "Stamina",
    "sourceName": "Stamina",
    "category": "physical",
    "offset": 84,
    "sourceGetterToken": "0x06000fc5",
    "fieldToken": "0x04000390",
    "getterIlSha256": "8c69ea0b113438fb325d12943c60a55217eac9b00796ab4c528783c1e67e8c61"
  },
  {
    "key": "strength",
    "name": "Strength",
    "sourceName": "Strength",
    "category": "physical",
    "offset": 83,
    "sourceGetterToken": "0x06000fc7",
    "fieldToken": "0x04000391",
    "getterIlSha256": "883da9dff920e5b3049f25109696dcac4b7b0e009d07138cc27e9fa629cbe8d0"
  },
  {
    "key": "corners",
    "name": "Corners",
    "sourceName": "Corners",
    "category": "technical",
    "offset": 74,
    "sourceGetterToken": "0x060012d2",
    "fieldToken": "0x0400036f",
    "getterIlSha256": "f9db749e95e951afb18c09b3ad5000726ec2abab15bb58144204b46a4c9b9f6e"
  },
  {
    "key": "crossing",
    "name": "Crossing",
    "sourceName": "Crossing",
    "category": "technical",
    "offset": 47,
    "sourceGetterToken": "0x060012d4",
    "fieldToken": "0x04000371",
    "getterIlSha256": "2d96833b0677e0fd96c00bd364a46beb6a1cba657fbda98bd34663599622cf3c"
  },
  {
    "key": "dribbling",
    "name": "Dribbling",
    "sourceName": "Dribbling",
    "category": "technical",
    "offset": 48,
    "sourceGetterToken": "0x060012d6",
    "fieldToken": "0x04000375",
    "getterIlSha256": "1edfb24ee21517f398361bc247f8d8e8d27cd88a4b42b229059887ed4a015696"
  },
  {
    "key": "finishing",
    "name": "Finishing",
    "sourceName": "Finishing",
    "category": "technical",
    "offset": 49,
    "sourceGetterToken": "0x060012d8",
    "fieldToken": "0x04000377",
    "getterIlSha256": "b371ce166f696d0e1d4382645ad4a9acb7d53069aeae6f84b42960eb1ba0e53c"
  },
  {
    "key": "firstTouch",
    "name": "FirstTouch",
    "sourceName": "FirstTouch",
    "category": "technical",
    "offset": 69,
    "sourceGetterToken": "0x060012da",
    "fieldToken": "0x04000378",
    "getterIlSha256": "886e7b3dedfe900c053cce8050c5e9387d7d0bd0f0aafa623ee9a0ce7b9fc438"
  },
  {
    "key": "freekicks",
    "name": "Freekicks",
    "sourceName": "Freekicks",
    "category": "technical",
    "offset": 82,
    "sourceGetterToken": "0x060012dc",
    "fieldToken": "0x0400037a",
    "getterIlSha256": "0a214a3c6240feddbcf6db3c41960da78e53a8bc851a7e394f4db8a554e8b92e"
  },
  {
    "key": "heading",
    "name": "Heading",
    "sourceName": "Heading",
    "category": "technical",
    "offset": 50,
    "sourceGetterToken": "0x060012de",
    "fieldToken": "0x0400037c",
    "getterIlSha256": "8ba49a42a944706686b321e7f25d1c90e389a2f3afb0fdea3406e1c7a424654a"
  },
  {
    "key": "longShots",
    "name": "LongShots",
    "sourceName": "LongShots",
    "category": "technical",
    "offset": 51,
    "sourceGetterToken": "0x060012e0",
    "fieldToken": "0x04000383",
    "getterIlSha256": "e9569b684e060b512943260f03289f5e59d95f22ceaf02f63ae63505e73eb783"
  },
  {
    "key": "longthrows",
    "name": "Longthrows",
    "sourceName": "Longthrows",
    "category": "technical",
    "offset": 77,
    "sourceGetterToken": "0x060012e2",
    "fieldToken": "0x04000384",
    "getterIlSha256": "94eeb5dd5405e007da31035d522eb672fc2182f652e9d85bd8e7eb1c66c55212"
  },
  {
    "key": "marking",
    "name": "Marking",
    "sourceName": "Marking",
    "category": "technical",
    "offset": 52,
    "sourceGetterToken": "0x060012e4",
    "fieldToken": "0x04000385",
    "getterIlSha256": "ab7f16c14eb191f4778c517d129bc3409bc9ae2f1769c556e1bdd3b1f893b6d4"
  },
  {
    "key": "passing",
    "name": "Passing",
    "sourceName": "Passing",
    "category": "technical",
    "offset": 54,
    "sourceGetterToken": "0x060012e6",
    "fieldToken": "0x0400038a",
    "getterIlSha256": "617643b40533f582778e2f2ac06c5ef30ef7f93b54d952d54f7f1cdbdf0d9040"
  },
  {
    "key": "penaltyTaking",
    "name": "PenaltyTaking",
    "sourceName": "PenaltyTaking",
    "category": "technical",
    "offset": 55,
    "sourceGetterToken": "0x060012e8",
    "fieldToken": "0x0400038b",
    "getterIlSha256": "db26637868465b8ca5c4b2f2c9edc8c0d522f0e04276d9b932156b9af2e90d94"
  },
  {
    "key": "tackling",
    "name": "Tackling",
    "sourceName": "Tackling",
    "category": "technical",
    "offset": 56,
    "sourceGetterToken": "0x060012ea",
    "fieldToken": "0x04000392",
    "getterIlSha256": "573fa78f908fa4e8efd3481f440dc212a1041b8c59a5db24d283513465c0296d"
  },
  {
    "key": "technique",
    "name": "Technique",
    "sourceName": "Technique",
    "category": "technical",
    "offset": 70,
    "sourceGetterToken": "0x060012ec",
    "fieldToken": "0x04000394",
    "getterIlSha256": "4fe050a355c49fcbae007db35ad0f3926fd72b69a35f976d019bec999dea2019"
  }
].map(Object.freeze));
