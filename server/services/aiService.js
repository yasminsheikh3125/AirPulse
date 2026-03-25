export const generateAIAdvice = (data) => {
  const advice = {
    general: [],
    asthma: [],
    runner: [],
    child: [],
    pregnant: []
  };

  const { aqi, pm25, temp, humidity, wind, weather, forecast72 = [] } = data;
  const bestWindow = forecast72.findIndex((value) => value <= 80);
  const bestHourText = bestWindow >= 0 ? `${bestWindow % 24}:00` : "later when AQI improves";

  if (aqi > 150) {
    advice.general.push("Air quality is unhealthy. Avoid prolonged outdoor exposure.");
  } else if (aqi > 100) {
    advice.general.push("Limit outdoor activities, especially in traffic-heavy areas.");
  } else {
    advice.general.push("Air quality is acceptable for normal activities.");
  }

  if (pm25 > 50) {
    advice.general.push("Fine particles are elevated, so a mask is a good idea outdoors.");
  } else {
    advice.general.push("Particle levels are manageable, but checking cleaner hours is still a good idea.");
  }

  if (temp > 35 && humidity > 70) {
    advice.general.push("Heat and humidity are high today, so stay hydrated and avoid midday exertion.");
  } else {
    advice.general.push("Weather stress is moderate today, so normal daily activity is generally fine.");
  }

  advice.general.push(`Current weather is ${weather}. Best outdoor window starts around ${bestHourText}.`);

  if (pm25 > 40 || aqi > 120) {
    advice.asthma.push("High risk of asthma triggers today. Carry your inhaler and prioritize indoor air.");
  } else {
    advice.asthma.push("Air quality is not at peak risk, but keep medication available if you are sensitive.");
  }
  if (wind < 2) {
    advice.asthma.push("Low wind may trap pollutants near the ground, so avoid roadside exposure.");
  } else {
    advice.asthma.push(`Outdoor time is better planned around ${bestHourText} when conditions are calmer.`);
  }

  if (aqi > 100) {
    advice.runner.push("Not suitable for outdoor running right now. Switch to an indoor workout.");
  } else {
    advice.runner.push("Conditions are acceptable for a lighter outdoor run.");
  }
  advice.runner.push(`If you want to train outside, try around ${bestHourText} when AQI is lower.`);
  advice.runner.push("Use lower-intensity training if pollution climbs during your session.");

  if (aqi > 100) {
    advice.child.push("Children and older adults should remain indoors during poor air hours.");
  } else {
    advice.child.push("Short outdoor time is okay, but use the cleaner-hour window for play or walks.");
  }
  if (temp > 34) {
    advice.child.push("Avoid outdoor play during peak heat hours.");
  } else {
    advice.child.push("Morning and evening are more comfortable than midday for outdoor activity.");
  }

  advice.pregnant.push("Use cleaner indoor spaces and avoid high-traffic routes when going out.");
  if (aqi > 100) {
    advice.pregnant.push("Reduce unnecessary outdoor exposure today because air quality is elevated.");
  } else {
    advice.pregnant.push(`If you need to step out, ${bestHourText} is a better outdoor window.`);
  }
  advice.pregnant.push("Choose less congested roads and keep travel time outdoors short when possible.");

  return advice;
};
