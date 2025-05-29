export const sort = (items, sortBy, sortOrder = "ASC") => {
    let firstData = "", secondData = "";
    if (sortBy && sortOrder) {
      if (sortOrder.toUpperCase() == 'ASC') {
        items.sort((a, b) => {
          firstData = typeof a[sortBy] == "string"  && a[sortBy] != null ? a[sortBy].toLowerCase() : a[sortBy], secondData = typeof b[sortBy] =="string" && b[sortBy] != null ? b[sortBy].toLowerCase() : b[sortBy];
          if (firstData < secondData) {
            return -1; // Return -1 to indicate a should come before b
          }
          if (firstData > secondData) {
            return 1; // Return 1 to indicate a should come after b
          }
          return 0;
        });
      } else {
        items.sort((a, b) => {
          firstData = typeof a[sortBy] == "string"  && a[sortBy] != null ? a[sortBy].toLowerCase() : a[sortBy], secondData = typeof b[sortBy] =="string" && b[sortBy] != null ? b[sortBy].toLowerCase() : b[sortBy];
          if (firstData < secondData) {
            return 1; // Return 1 to indicate a should come after b
          }
          if (firstData > secondData) {
            return -1; // Return -1 to indicate a should come before b
          }
          return 0;
        });
      }
    }
    return items;
  }
  
  // for pagination
  export const pagination = (items, page = 1, limit = 10) => {
      const startIndex = (page - 1) * limit;
      let paginatedItems = items.slice(startIndex, startIndex + limit);
      return paginatedItems;
  }
  
  //Retriving selected fields from items
  export const selectFields = (items, columnFields) => {
      if(columnFields !== undefined){
          let selectedItems = [];
          items.map(item => {
              const selectedItem = {};
              columnFields.forEach(field => {
                  if (item.hasOwnProperty(field)) {
                      selectedItem[field] = item[field];
                  }
              });
              selectedItems.push(selectedItem);
          });
          items = selectedItems;
      }
      return items;
  }
  