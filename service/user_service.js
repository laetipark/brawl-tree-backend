import {
    Brawlers, Maps,
    UserBattles,
    UserBrawlerBattles,
    UserBrawlerItems,
    UserBrawlers,
    UserProfile,
    Users
} from "../models/index.js";
import {col, fn, literal, Op, where} from "sequelize";

export class userService {
    static selectUser = async id =>
        await Users.findOne({
            include: [
                {
                    model: UserProfile,
                    required: true,
                    attributes: []
                },
            ],
            attributes: ["USER_ID", "USER_LST_CK", "USER_LST_BT", "USER_CR", "USER_CR_NM",
                [col("UserProfile.USER_NM"), "USER_NM"],
                [col("UserProfile.USER_PRFL"), "USER_PRFL"]],
            where: {
                USER_ID: `#${id}`
            }
        });

    static selectUserProfile = async id =>
        await UserProfile.findOne({
            attributes: ["CLUB_ID", "CLUB_NM",
                "TROPHY_CUR", "TROPHY_HGH",
                "VICTORY_TRP", "VICTORY_DUO",
                "BRAWLER_RNK_25", "BRAWLER_RNK_30", "BRAWLER_RNK_35",
                "PL_SL_CUR", "PL_SL_HGH", "PL_TM_CUR", "PL_TM_HGH"],
            where: {
                USER_ID: `#${id}`
            }
        });

    static selectUserBattleRecordSummary = async (id, type, season) => {
        const query = {
            MATCH_TYP: {},
            MAP_MD_CD: {}
        };

        if (type === "all") {
            query.MATCH_TYP = {
                [Op.in]: [0, 2, 3]
            };
            query.MAP_MD_CD = {
                [Op.in]: [0, 1, 2, 3]
            };
        } else if (type === "trophyTriple") {
            query.MATCH_TYP = 0;
            query.MAP_MD_CD = 3;
        } else if (type === "trophyShowdown") {
            query.MATCH_TYP = 0;
            query.MAP_MD_CD = {
                [Op.in]: [1, 2]
            };
        } else if (type === "powerSolo") {
            query.MATCH_TYP = 2;
            query.MAP_MD_CD = 3;
        } else if (type === "powerTeam") {
            query.MATCH_TYP = 3;
            query.MAP_MD_CD = 3;
        }

        const userBattles = [await UserBattles.findAll({
            attributes: [
                [fn("DATE_FORMAT", col("MATCH_DT"), "%Y-%m-%d"), "day"],
                [fn("COUNT", "MATCH_DT"), "value"],
            ],
            where: {
                USER_ID: `#${id}`,
                PLAYER_ID: `#${id}`,
                MATCH_DT: {
                    [Op.between]: [season.SEASON_BGN_DT, season.SEASON_END_DT]
                },
                MATCH_TYP: query.MATCH_TYP,
                MAP_MD_CD: query.MAP_MD_CD
            },
            group: [fn("DATE_FORMAT", col("MATCH_DT"), "%Y-%m-%d")],
        }), await UserBattles.findAll({
            attributes: [
                [fn("DATE_FORMAT", col("MATCH_DT"), "%Y-%m-%d"), "day"],
                [fn("SUM", literal("CASE WHEN MATCH_TYP NOT IN (4, 5) THEN MATCH_CHG ELSE 0 END")), "value"],
            ],
            where: {
                USER_ID: `#${id}`,
                PLAYER_ID: `#${id}`,
                MATCH_DT: {
                    [Op.between]: [season.SEASON_BGN_DT, season.SEASON_END_DT]
                },
                MATCH_TYP: query.MATCH_TYP,
                MAP_MD_CD: query.MAP_MD_CD
            },
            group: [fn("DATE_FORMAT", col("MATCH_DT"), "%Y-%m-%d")],
        })];

        const userDailyBattles = await UserBattles.findAll({
            include: [
                {
                    model: Maps,
                    required: true,
                    attributes: []
                },
            ],
            attributes: ["MATCH_DT", "BRAWLER_ID", "MATCH_TYP",
                "MATCH_RNK", "MATCH_RES", [col("Map.MAP_MD"), "MAP_MD"]],
            where: {
                USER_id: `#${id}`,
                PLAYER_ID: `#${id}`,
                MATCH_DT: {
                    [Op.between]: [season.SEASON_BGN_DT, season.SEASON_END_DT]
                },
                MATCH_TYP: query.MATCH_TYP,
                MAP_MD_CD: query.MAP_MD_CD,
            },
            order: [["MATCH_DT", "DESC"]],
            limit: 20,
            raw: true
        });

        const userBrawlers = await UserBrawlerBattles.findAll({
            include: [
                {
                    model: Brawlers,
                    required: true,
                    attributes: []
                },
            ],
            attributes: [
                "BRAWLER_ID",
                [fn("SUM", col("MATCH_CNT")), "MATCH_CNT"],
                [fn("ROUND",
                    literal("SUM(`MATCH_CNT`) * 100 / SUM(SUM(`MATCH_CNT`)) OVER()")
                    , 2
                ), "MATCH_PCK_R"],
                [fn("ROUND",
                    literal("SUM(`MATCH_VIC_CNT`) * 100 / SUM(`MATCH_VIC_CNT` + `MATCH_DEF_CNT`)")
                    , 2
                ), "MATCH_VIC_R"],
                [col("Brawler.BRAWLER_NM"), "BRAWLER_NM"],
            ],
            where: {
                USER_ID: `#${id}`,
                MATCH_TYP: query.MATCH_TYP,
                MAP_MD_CD: query.MAP_MD_CD,
            },
            order: [["MATCH_CNT", "DESC"]],
            group: ["BRAWLER_ID", "BRAWLER_NM"],
            limit: 5,
            raw: true
        });

        return [userBattles, userBrawlers, userDailyBattles];
    };

    static selectUserBrawlers = async (userID) => {
        const brawlers = await Brawlers.findAll({
            include: [
                {
                    model: UserBrawlers,
                    required: true,
                    attributes: []
                },
                {
                    model: UserBrawlerBattles,
                    required: false,
                    attributes: []
                },
            ],
            attributes: [
                "BRAWLER_ID", "BRAWLER_NM", "BRAWLER_RRT",
                [col("UserBrawlers.USER_ID"), "USER_ID"],
                [col("UserBrawlers.BRAWLER_PWR"), "BRAWLER_PWR"],
                [col("UserBrawlers.TROPHY_BGN"), "TROPHY_BGN"],
                [col("UserBrawlers.TROPHY_CUR"), "TROPHY_CUR"],
                [col("UserBrawlers.TROPHY_HGH"), "TROPHY_HGH"],
                [col("UserBrawlers.TROPHY_RNK"), "TROPHY_RNK"],
                [fn("ROUND",
                    fn("IFNULL",
                        literal("SUM(CASE WHEN `UserBrawlerBattles`.`MATCH_TYP` = 0 THEN `UserBrawlerBattles`.`MATCH_CNT` ELSE 0 END) * 100 / " +
                            "SUM(SUM(CASE WHEN `UserBrawlerBattles`.`MATCH_TYP` = 0 THEN `UserBrawlerBattles`.`MATCH_CNT` ELSE 0 END)) OVER()")
                        , 0)
                    , 2
                ), "MATCH_PCK_R_TL"],
                [fn("ROUND",
                    fn("IFNULL",
                        literal("SUM(CASE WHEN `UserBrawlerBattles`.`MATCH_TYP` = 0 THEN `UserBrawlerBattles`.`MATCH_VIC_CNT` ELSE 0 END) * 100 / " +
                            "SUM(CASE WHEN `UserBrawlerBattles`.`MATCH_TYP` = 0 THEN `UserBrawlerBattles`.`MATCH_VIC_CNT` + `UserBrawlerBattles`.`MATCH_DEF_CNT` ELSE 0 END)")
                        , 0)
                    , 2
                ), "MATCH_VIC_R_TL"],
                [fn("ROUND",
                    fn("IFNULL",
                        literal("SUM(CASE WHEN `UserBrawlerBattles`.`MATCH_TYP` in (2, 3) THEN `UserBrawlerBattles`.`MATCH_CNT` ELSE 0 END) * 100 / " +
                            "SUM(SUM(CASE WHEN `UserBrawlerBattles`.`MATCH_TYP` = 0 THEN `UserBrawlerBattles`.`MATCH_CNT` ELSE 0 END)) OVER()")
                        , 0)
                    , 2
                ), "MATCH_PCK_R_PL"],
                [fn("ROUND",
                    fn("IFNULL",
                        literal("SUM(CASE WHEN `UserBrawlerBattles`.`MATCH_TYP` in (2, 3) THEN `UserBrawlerBattles`.`MATCH_VIC_CNT` ELSE 0 END) * 100 / " +
                            "SUM(CASE WHEN `UserBrawlerBattles`.`MATCH_TYP` = 0 THEN `UserBrawlerBattles`.`MATCH_VIC_CNT` + `UserBrawlerBattles`.`MATCH_DEF_CNT` ELSE 0 END)")
                        , 0)
                    , 2
                ), "MATCH_VIC_R_PL"],
            ],
            where: {
                $where1: where(col("UserBrawlers.USER_ID"), `#${userID}`)
            },
            group: ["BRAWLER_ID", "BRAWLER_NM"],
            order: [[col("UserBrawlers.TROPHY_CUR"), "DESC"]],
            raw: true
        });

        const items = await UserBrawlerItems.findAll({
            where: {
                USER_ID: `#${userID}`,
            },
        });

        const graph = await UserBattles.findAll({
            attributes: [
                [fn("DISTINCT", col("BRAWLER_ID")), "BRAWLER_ID"],
                [fn("DATE_FORMAT", col("MATCH_DT"), "%m-%d"), "x"],
                [literal("SUM(`MATCH_CHG`) OVER(PARTITION BY `BRAWLER_ID` ORDER BY DATE(MATCH_DT))"), "y"]],
            where: {
                USER_ID: `#${userID}`,
                PLAYER_ID: `#${userID}`,
                MATCH_TYP: 0,
            }
        });

        return [brawlers, items, graph];
    };
}