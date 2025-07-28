class LoLDataParser {
  /**
   * Parse raw crawler data thành format dễ sử dụng
   * @param {Object} rawData - Raw data từ crawler
   * @returns {Array} Parsed matches data
   */
  static parseEvents(rawData) {
    if (!rawData?.esports?.events) {
      return [];
    }

    return rawData.esports.events.map(event => {
      return {
        id: event.id,
        league: {
          image: event.league?.image || '',
          name: event.league?.name || '',
          slug: event.league?.slug || ''
        },
        matchFormat: `BO${event.match?.strategy?.count || 1}`,
        matchTeams: (event.matchTeams || []).map(team => ({
          name: team.name || '',
          code: team.code || '',
          image: team.image || team.lightImage || '',
          gameWins: team.result?.gameWins || 0,
          outcome: team.result?.outcome || null
        })),
        startTime: event.startTime,
        state: event.state,
        type: event.type,
        blockName: event.blockName || '',
        tournament: {
          name: event.tournament?.name || '',
          id: event.tournament?.id || ''
        }
      };
    });
  }

  /**
   * Lọc events theo criteria
   * @param {Array} events - Parsed events
   * @param {Object} filters - Filter options
   * @returns {Array} Filtered events
   */
  static filterEvents(events, filters = {}) {
    let filtered = [...events];
    if (filters.league) {
      filtered = filtered.filter(event => 
        event.league.slug === filters.league || 
        event.league.slug.toLowerCase() === filters.league.toLowerCase()
      );
    }

    if (filters.state) {
      filtered = filtered.filter(event => event.state === filters.state);
    }

    if (filters.dateFrom) {
      filtered = filtered.filter(event => 
        new Date(event.startTime) >= new Date(filters.dateFrom)
      );
    }

    if (filters.dateTo) {
      filtered = filtered.filter(event => 
        new Date(event.startTime) <= new Date(filters.dateTo)
      );
    }

    return filtered;
  }

  /**
   * Sắp xếp events theo thời gian
   * @param {Array} events - Events array
   * @param {string} order - 'asc' hoặc 'desc'
   * @returns {Array} Sorted events
   */
  static sortEventsByTime(events, order = 'asc') {
    return events.sort((a, b) => {
      const timeA = new Date(a.startTime);
      const timeB = new Date(b.startTime);
      return order === 'asc' ? timeA - timeB : timeB - timeA;
    });
  }

  /**
   * Group events theo league
   * @param {Array} events - Events array
   * @returns {Object} Grouped events by league
   */
  static groupByLeague(events) {
    return events.reduce((groups, event) => {
      const leagueName = event.league.name;
      if (!groups[leagueName]) {
        groups[leagueName] = [];
      }
      groups[leagueName].push(event);
      return groups;
    }, {});
  }

  /**
   * Group events theo ngày
   * @param {Array} events - Events array
   * @returns {Object} Grouped events by date
   */
  static groupByDate(events) {
    return events.reduce((groups, event) => {
      const vnTime = this.formatTime(event.startTime, 'vi-VN');
      const dateKey = vnTime.dateKey;
      
      if (!groups[dateKey]) {
        groups[dateKey] = {
          dateKey,
          displayDate: vnTime.fullDate,
          events: []
        };
      }
      
      groups[dateKey].events.push({
        ...event,
        formattedTime: vnTime
      });
      
      return groups;
    }, {});
  }

  /**
   * Get unique leagues từ events
   * @param {Array} events - Events array
   * @returns {Array} Unique leagues
   */
  static getUniqueLeagues(events) {
    const leagues = new Map();
    events.forEach(event => {
      if (!leagues.has(event.league.slug)) {
        leagues.set(event.league.slug, event.league);
      }
    });
    return Array.from(leagues.values());
  }

  /**
   * Format start time cho hiển thị theo múi giờ Việt Nam (UTC+7)
   * @param {string} startTime - ISO timestamp
   * @param {string} locale - Locale string
   * @returns {Object} Formatted time info
   */
  static formatTime(startTime, locale = 'vi-VN') {
    const date = new Date(startTime);
    
    // Chuyển về múi giờ Việt Nam (UTC+7)
    const vnDate = new Date(date.getTime() + (7 * 60 * 60 * 1000));
    const utcDate = new Date(date.getTime() + date.getTimezoneOffset() * 60000);
    const vnTime = new Date(utcDate.getTime() + (7 * 60 * 60 * 1000));
    
    const options = {
      timeZone: 'Asia/Ho_Chi_Minh',
    };
    
    // Format cho hiển thị
    const dateOptions = { ...options, year: 'numeric', month: '2-digit', day: '2-digit' };
    const timeOptions = { ...options, hour: '2-digit', minute: '2-digit', hour12: false };
    const fullDateOptions = { 
      ...options, 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    
    const formattedDate = vnTime.toLocaleDateString('vi-VN', dateOptions);
    const formattedTime = vnTime.toLocaleTimeString('vi-VN', timeOptions);
    const fullDate = vnTime.toLocaleDateString('vi-VN', fullDateOptions);
    
    return {
      date: formattedDate,
      time: formattedTime,
      full: `${formattedDate} ${formattedTime}`,
      fullDate: fullDate,
      dateKey: formattedDate, // DD/MM/YYYY
      timestamp: vnTime.getTime(),
      iso: startTime,
      vnTime: vnTime
    };
  }

  /**
   * Translate state sang tiếng Việt
   * @param {string} state - Event state
   * @returns {string} Vietnamese state
   */
  static translateState(state) {
    const stateMap = {
      'unstarted': 'Chưa bắt đầu',
      'inProgress': 'Đang diễn ra', 
      'completed': 'Đã kết thúc'
    };
    return stateMap[state] || state;
  }

  /**
   * Get today's date key for filtering
   * @returns {string} Today's date in DD/MM/YYYY format
   */
  static getTodayDateKey() {
    const today = new Date();
    const vnTime = new Date(today.getTime() + (7 * 60 * 60 * 1000));
    return vnTime.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit', 
      day: '2-digit'
    });
  }
}

module.exports = LoLDataParser; 