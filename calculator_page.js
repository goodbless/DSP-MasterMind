const unit_of_prodction = ["sec", "min"]

var product
var rate

var current_production_tree
var current_production_table
var preferred_formula = {}


$(function () {
    load_data()
    $("#show-formula-btn").click(function () {
        // $("#formula-table").fadeToggle()
        var btn = this
        $("#formula-table").slideToggle("normal", function () {
            btn.innerHTML = this.style.display == "none" ? "显示配方" : "隐藏配方" // $(btn).text(this.style.display == "none" ? "显示配方" : "隐藏配方") // 等价写法
        })
    })
    $("#cal-btn").click(function () {
        product = $("#product-select").val()
        rate = parseInt($("#product-rate").val())
        if (!(rate || "")) {
            alert("请输入产量！")
            return
        }
        current_production_tree = get_production_tree(product, rate)
        console.log("生产树：")
        console.log(current_production_tree)
        // display_production_tree()
        console.log("产出表")
        current_production_table = solve_production_table(product, rate)
        console.log(current_production_table)
        display_production_table()

    })
})

function display_production_tree() {
    if (current_production_tree) {
        $("#product-tree").empty().append($("<ul>").addClass("list-group").append(production_tree_html(current_production_tree)))
    }
}

function product_div(info) {
    var div = $("<div class='box'>").append("<span class='box-title'>" + info.item + "</span><br>")
    div.append("配方：")
    var all_formula = out_in_map[info.item]
    if (all_formula.length > 1) {
        var select = $("<select>").attr({
            "name": "formulas",
            "id": "formula-select",
            "class": "form-control-sm"
        })
        select.change(function () {
            preferred_formula[info.item] = this.value
            current_production_table = solve_production_table(product, rate)
            // console.log(current_production_table)
            display_production_table()
        })
        all_formula.forEach(function (fml, index) {
            var option = $("<option>").attr("value", fml.id).html(formula_title(fml))
            if (fml == info.formula) {
                option.attr("selected", true)
            }
            select.append(option)
        })
        div.append(select)
    }
    else {
        div.append(formula_title(info.formula))
    }
    div.append("<br>")
    div.append(`设施： ${info.formula.f} ${info.rate * info.formula.t / info.formula.out[info.item]}`)

    return div
}

function display_production_table() {
    if (current_production_table) {
        var table_dom = $("#product-table").empty()
        table_dom.append($("<h3>").text("最终产物"))
        var info = current_production_table.final
        table_dom.append($(product_div(info).addClass("final-product")))

        if (current_production_table["by-product"].length > 0) {
            table_dom.append($("<h3>").text("副产品"))
            $.each(current_production_table["by-product"], (idx, info) => {
                var strHtml = "<div class='box by-product'>"
                strHtml += "<span class='box-title'>" + info.item + "</span><br>"
                strHtml += "产出量：" + (-info.rate)
                strHtml += "</div>"
                table_dom.append($(strHtml))
            })
        }

        if (current_production_table["intermediate"].length > 0) {
            table_dom.append($("<h3>").text("中间产品"))
            $.each(current_production_table["intermediate"], (idx, info) => {
                table_dom.append(product_div(info).addClass("intermediate"))
            })
        }

        table_dom.append($("<h3>").text("原材料"))
        $.each(current_production_table["raw-material"], (idx, info) => {
            var strHtml = "<div class='box raw-material'>"
            strHtml += "<span class='box-title'>" + info.item + "</span><br>"
            strHtml += "需求量：" + info.rate
            strHtml += "</div>"
            table_dom.append($(strHtml))
        })
    }
}

function load_data() {
    //使用getJSON读取userinfo.json文件中的数据
    $.getJSON("dsp_data.json", function (data) {
        console.log(data)
        formula = data.formula

        out_in_map = {}
        formula.forEach((el, index) => {
            el.id = index
            $.each(el.out, (item, num) => {
                out_in_map[item] = !out_in_map[item] ? [] : out_in_map[item]
                out_in_map[item].push(el)
            })
        })

        console.log(out_in_map)
        update_by_formula()
    })
}

function get_production_tree(item_need, production_rate) {
    var available_fml = out_in_map[item_need]
    if (available_fml == null) {
        return production_rate
    }
    available_fml.sort((a, b) => b.out[item_need] / b.t - a.out[item_need] / a.t)
    var node = {
        "product": item_need,
        "rate": production_rate,
        "all_formula": available_fml
    }

    return update_tree_formula(node, available_fml[0])
}

function update_tree_formula(node, formula) {
    node.formula = formula
    node.facility_need = node.rate * formula.t / formula.out[node.product]
    node.upstream = {}
    $.each(formula.in, (mat, cost) => {
        node.upstream[mat] = get_production_tree(mat, node.rate * cost / formula.out[node.product])
    })
    return node
}

function has_specific_input(f, m) {
    return m.some(v => f.in[v])
}

function solve_production_table(demand_item, demand_rate) {
    var pTable = {}
    var unsolved_stack = []
    unsolved_stack.push({
        "item": demand_item,
        "rate": demand_rate
    })
    var demand
    while (demand = unsolved_stack.pop()) {
        var all_formula = out_in_map[demand.item]
        if (!all_formula || all_formula.length == 0) {
            var product_info = pTable[demand.item]
            if (product_info) {
                product_info.rate += demand.rate
            }
            else {
                pTable[demand.item] = {
                    "item": demand.item,
                    "rate": demand.rate
                }
            }
        }
        else {

            all_formula.sort((a, b) => {
                b.out[demand.item] / b.t - a.out[demand.item] / a.t
            })
            let formula = all_formula[0]
            if (preferred_formula && preferred_formula[demand.item]) {
                var p_f = all_formula.find(f => f.id == preferred_formula[demand.item])
                if (p_f) {
                    formula = p_f
                }
            }

            var product_info = pTable[demand.item]
            if (product_info) {
                product_info.formula = formula
                product_info.rate += demand.rate
            }
            else {
                pTable[demand.item] = {
                    "item": demand.item,
                    "formula": formula,
                    "rate": demand.rate
                }
            }

            for (const by_product in formula.by) {
                var by_prodction_rate = formula.by[by_product]
                var product_info = pTable[by_product]
                if (product_info) {
                    product_info.rate -= demand.rate * by_prodction_rate / formula.out[demand.item]
                }
                else {
                    pTable[by_product] = {
                        "item": by_product,
                        "rate": -demand.rate * by_prodction_rate / formula.out[demand.item]
                    }
                }
            }

            for (const mat in formula.in) {
                const cost = formula.in[mat]
                unsolved_stack.push({
                    "item": mat,
                    "rate": demand.rate * cost / formula.out[demand.item]
                })
            }
        }
    }

    var classified_table = {
        "final": undefined,
        "intermediate": [],
        "by-product": [],
        "raw-material": []
    }
    $.each(pTable, (item, info) => {
        if (info.rate < 0) {
            classified_table["by-product"].push(info)
        }
        else if (!info.formula) {
            classified_table["raw-material"].push(info)
        }
        else if (info.item == demand_item) {
            classified_table.final = info
        }
        else {
            classified_table["intermediate"].push(info)
        }
    })

    return classified_table
}

function production_tree_html(node) {
    var strHtml = $("<li>").addClass("list-group_item")

    if (typeof (node) == "object") {
        strHtml.append(node.product + "(" + node.formula.f + " " + node.facility_need + ")")
        if (node.all_formula.length > 1) {
            strHtml.append("&nbsp;&nbsp;&nbsp;其他配方:")
            node.all_formula.forEach(fml => {
                if (fml != node.formula) {
                    var opt_fml = $(`<span class='optional-formula'>${formula_title(fml)} (${fml.f})</span>`)
                    opt_fml.click(function () {
                        console.log("switch formula")
                        console.log(opt_fml)
                        update_tree_formula(node, fml)
                        display_production_tree()
                    })
                    strHtml.append(opt_fml)
                }
            })
        }
        var child_nodes = $("<ul>").addClass("list-group")
        $.each(node.upstream, (mat, child) => {
            if (typeof (child) == "object") {
                child_nodes.append($("<li>").addClass("list-group-item").append(production_tree_html(child)))
            }
            else {
                child_nodes.append($("<li>").addClass("list-group-item").append(mat + "(原材料产能 " + child + ")"))
            }

        })
        strHtml.append(child_nodes)
        return strHtml
    }

    return ""
}

function update_by_formula() {
    //获取产物选择列表的dom
    var productionselect = $("#product-select")
    for (const key in out_in_map) {
        // productionselect.append(`<option value="${key}">${key}</option>`)
        // productionselect.append("<option value=\"" + key + "\">" + key + "</option>")
        productionselect.append($("<option>").attr("value", key).text(key))
    }
    //获取formula的div
    var formulatable = $("#formula-table")
    //存储数据的变量 
    var strHtml = ""
    //清空内容 
    formulatable.empty()
    //将获取到的json格式数据遍历到div中
    $.each(formula, function (infoIndex, info) {
        formulatable.append(formula_div(info))
    })
    formulatable.hide()
}

function formula_div(formula) {
    var strHtml = "<div class='box'>"
    strHtml += "产品："
    const outputs = formula["out"]
    for (const pd in outputs) {
        const yield = outputs[pd]
        strHtml += "<span class='material output'>" + yield + " " + pd + "</span>"
    }
    strHtml += "<br>"
    strHtml += "原料："
    const inputs = formula["in"]
    for (const rm in inputs) {
        const consume = inputs[rm]
        strHtml += "<span class='material input'>" + consume + " " + rm + "</span>"
    }
    strHtml += "<br>"
    strHtml += "耗时：" + formula["t"] + "<br>"
    strHtml += "设施：" + formula["f"]
    strHtml += "</div>"
    return strHtml
}

function formula_title(formula) {
    var t = ""
    $.each(formula.in, (mat, n) => {
        t += n + mat + " "
    })

    t += "->&nbsp;"

    $.each(formula.out, (pdc, n) => {
        t += n + pdc
    })

    return t
}
