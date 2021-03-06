var request = require("superagent")
  , page = require("page")
  , loading = require("loading-lock")
  , dom = require("dom")
  , json = require("json")
  , each = require("each")
  , locker = loading(dom("#actual_results").els[0], {size: 80})
  , advlocker = loading(dom("#advancedOptions").els[0], {size: 60})
  , notify = require("notification")
  , isArray = require("isArray")
  ;
  
function isIntNumber(n) {
  return !isNaN(parseFloat(n)) && isFinite(n) && n % 1 === 0;
}

function formatIntNumber(n) {
  return Math.floor(parseFloat(n));
}  

function clearPage(){
  dom("#main, #about").each(function (item){
    item.els[0].style.display = 'none';
  });
}

function showIndex(){
  clearPage();
  dom("#main").els[0].style.display = '';
}

function showAssumptions(){
  clearPage();
  dom("#about").els[0].style.display = '';
}
  
module.exports = function run(){
  page("", showIndex);
  page("/", showIndex);
  page("/about", showAssumptions);
  page();

  var numberFields = [
    "#defRating"
  , "#shieldRating"
  , "#absorbRating"
  , "#armorRating"
  ];

  each(numberFields, function (field){
    dom(field).on('keyup', validateNumber);
    dom(field).on('change', validateNumber);
    dom(field).on('blur', validateNumber);
  });
  
  dom("#process").on('click', function (e){
    e.preventDefault();
    
    locker.lock();
    
    var klass = dom("#class").els[0];
    var stim = dom("#stim").els[0];
    var relic1 = dom("#relic1").els[0];
    var relic2 = dom("#relic2").els[0];
        
    var data = {
      'class': klass.options[klass.selectedIndex].value
    , 'stim': stim.options[stim.selectedIndex].value
    , 'defRating': formatIntNumber(dom("#defRating").els[0].value)
    , 'shieldRating': formatIntNumber(dom("#shieldRating").els[0].value)
    , 'absorbRating': formatIntNumber(dom("#absorbRating").els[0].value)
    , 'armorRating': formatIntNumber(dom("#armorRating").els[0].value)
    , 'relic1': relic1.options[relic1.selectedIndex].value
    , 'relic2': relic2.options[relic2.selectedIndex].value
    , 'advanced': false
    };
    
    if (dom("#useAdvanced").els[0].checked){
      data.advanced = {
        dmgMRKE: parseFloat(dom("#dmgMRKE").els[0].value)
      , dmgFTKE: parseFloat(dom("#dmgFTKE").els[0].value)
      , dmgFTIE: parseFloat(dom("#dmgFTIE").els[0].value)
      , timePerSwing: parseFloat(dom("#swingTime").els[0].value)
      , shieldLow: parseFloat(dom("#shieldLow").els[0].value)
      , shieldHigh: parseFloat(dom("#shieldHigh").els[0].value)
      };
    }
    
    request.post("/api/optimize")
           .send(data)
           .set('Accept', 'application/json')
           .end(function (err, res){
              if (err || (res.status != 200 && res.status != 304)){
                notify.error(err);
              }
              else {
                var resp = json.parse(res.text);
                if (resp.error){
                  if (isArray(resp.error)){
                    each(resp.error, function (err){
                      notify.error(err);
                    });
                  }
                  else {
                    notify.error(resp.error);
                  }
                }
                else {
                  var all_data = resp.result;
                  var results = all_data.after;
                  var prior = all_data.before;
                  
                  var ddiff = results.defRating - prior.defRating;
                  var dclass = ddiff >= 0 ? 'add' : 'sub';
                  ddiff = "" + (ddiff >= 0 ? "+" : "") + ddiff;
                  
                  var sdiff = results.shieldRating - prior.shieldRating;
                  var sclass = sdiff >= 0 ? 'add' : 'sub';
                  sdiff = "" + (sdiff >= 0 ? "+" : "") + sdiff;
                  
                  var adiff = results.absorbRating - prior.absorbRating;
                  var aclass = adiff >= 0 ? 'add' : 'sub';
                  adiff = "" + (adiff >= 0 ? "+" : "") + adiff;
                  
                  var defdiff1 = results.defPctNBNS - prior.defPctNBNS;
                  var defclass1 = defdiff1 >= 0 ? 'add' : 'sub';
                  defdiff1 = "" + (defdiff1 >= 0 ? "+" : "") + Math.floor(defdiff1 * 10000) / 100 + "%";
                  
                  var defdiff2 = results.defPctNB - prior.defPctNB;
                  var defclass2 = defdiff2 >= 0 ? 'add' : 'sub';
                  defdiff2 = "" + (defdiff2 >= 0 ? "+" : "") + Math.floor(defdiff2 * 10000) / 100 + "%";
                  
                  var spdiff = results.shieldPctNB - prior.shieldPctNB;
                  var spclass = spdiff >= 0 ? 'add' : 'sub';
                  spdiff = "" + (spdiff >= 0 ? "+" : "") + Math.floor(spdiff * 10000) / 100 + "%";
                  
                  var apdiff = results.absorbPctNB - prior.absorbPctNB;
                  var apclass = apdiff >= 0 ? 'add' : 'sub';
                  apdiff = "" + (apdiff >= 0 ? "+" : "") + Math.floor(apdiff * 10000) / 100 + "%";
                  
                  var mdiff = results.mitigation - prior.mitigation;
                  var mclass = mdiff >= 0 ? 'add' : 'sub';
                  mdiff = "" + (mdiff >= 0 ? "+" : "") + Math.floor(mdiff * 10000) / 100 + "%";
                  
                  dom("#actual_results #defRatingValue").els[0].innerHTML = results.defRating;
                  dom("#actual_results #defRatingDiff").els[0].innerHTML = "<span class='" + dclass + "'>" + ddiff + "</span>";
                  dom("#actual_results #shieldRatingValue").els[0].innerHTML = results.shieldRating;
                  dom("#actual_results #shieldRatingDiff").els[0].innerHTML = "<span class='" + sclass + "'>" + sdiff + "</span>";
                  dom("#actual_results #absorbRatingValue").els[0].innerHTML = results.absorbRating;
                  dom("#actual_results #absorbRatingDiff").els[0].innerHTML = "<span class='" + aclass + "'>" + adiff + "</span>";
                  
                  dom("#actual_results #defPctNS").els[0].innerHTML = Math.floor(results.defPctNBNS * 10000) / 100 + "%";
                  dom("#actual_results #defPctNSDiff").els[0].innerHTML = "<span class='" + defclass1 + "'>" + defdiff1 + "</span>";
                  dom("#actual_results #defPctS").els[0].innerHTML = Math.floor(results.defPctNB * 10000) / 100 + "%";
                  dom("#actual_results #defPctSDiff").els[0].innerHTML = "<span class='" + defclass2 + "'>" + defdiff2 + "</span>";
                  dom("#actual_results #shieldPct").els[0].innerHTML = Math.floor(results.shieldPctNB * 10000) / 100 + "%";
                  dom("#actual_results #shieldPctDiff").els[0].innerHTML = "<span class='" + spclass + "'>" + spdiff + "</span>";
                  dom("#actual_results #absorbPct").els[0].innerHTML = Math.floor(results.absorbPctNB * 10000) / 100 + "%";
                  dom("#actual_results #absorbPctDiff").els[0].innerHTML = "<span class='" + apclass + "'>" + apdiff + "</span>";
                  dom("#actual_results #mitigationPct").els[0].innerHTML = Math.floor(results.mitigation * 10000) / 100 + "%";
                  dom("#actual_results #mitigationPctDiff").els[0].innerHTML = "<span class='" + mclass + "'>" + mdiff + "</span>";
                }
              }
              locker.unlock();
           });
  });
  
  dom("#clear").on('click', function (e){
    e.preventDefault();
    each(numberFields, function (field){
      dom(field).els[0].value = 0;
    });
    
    dom("#class").els[0].selectedIndex = 0;
    dom("#stim").els[0].selectedIndex = 0;
  });
  
  dom("a#extraParams").on('click', function (e){
    e.preventDefault();
    
    var left_to_do = 2;
    
    function finallie(){
      if (left_to_do <= 0){
        advlocker.unlock();
        dom("#advancedOptions>fieldset").els[0].style.display = ''; 
      }
    }
    
    advlocker.lock();
    request.get("/api/combat-data").end(function (err, res){
      if (err){
        notify.error(err);
      }
      else {
        var resp = json.parse(res.text);
        
        if (resp.error){
          if (isArray(resp.error)){
            each(resp.error, function (err){
              notify.error(err);
            });
          }
          else {
            notify.error(resp.error);
          }
        }
        else {
          dom("#dmgMRKE").els[0].value = parseFloat(resp.dmgMRKE || 0);
          dom("#dmgFTKE").els[0].value = parseFloat(resp.dmgFTKE || 0);
          dom("#dmgFTIE").els[0].value = parseFloat(resp.dmgFTIE || 0);
          dom("#swingTime").els[0].value = parseFloat(resp.timePerSwing || 0);
        }
      }
    
      left_to_do -= 1;
      finallie();
    });
    
    request.get("/api/shield-data").end(function (err, res){
      if (err){
        notify.error(err);
      }
      else {
        var resp = json.parse(res.text);
        if (resp.error){
          if (isArray(resp.error)){
            each(resp.error, function (err){
              notify.error(err);
            });
          }
          else {
            notify.error(resp.error);
          }
        }
        else {
          dom("#shieldLow").els[0].value = parseFloat(resp.low);
          dom("#shieldHigh").els[0].value = parseFloat(resp.high);
        }        
      }
      
      left_to_do -= 1;
      finallie();
    });
  });
}

function validateNumber(e){
  if (!isIntNumber(e.target.value) && e.target.value !== ''){
    e.target.value = formatIntNumber(e.target.value);
  }
}
