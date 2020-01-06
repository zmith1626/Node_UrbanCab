"use strict";

function getCurrentDate(date) {
  let day = String(date).split("-")[0];
  let month = String(date).split("-")[1];
  let year = String(date).split("-")[2];
  let formattedDate = String(day) + " " + getMonth(month) + " " + String(year);
  return formattedDate;
}

function getMonth(month) {
  let cMonth = "";
  switch (Number(month)) {
    case 1:
      cMonth = "Jan";
      break;
    case 2:
      cMonth = "Feb";
      break;
    case 3:
      cMonth = "Mar";
      break;
    case 4:
      cMonth = "Apr";
      break;
    case 5:
      cMonth = "May";
      break;
    case 6:
      cMonth = "June";
      break;
    case 7:
      cMonth = "July";
      break;
    case 8:
      cMonth = "Aug";
      break;
    case 9:
      cMonth = "Sep";
      break;
    case 10:
      cMonth = "Oct";
      break;
    case 11:
      cMonth = "Nov";
      break;
    default:
      cMonth = "Dec";
      break;
  }

  return cMonth;
}

module.exports = getCurrentDate;
