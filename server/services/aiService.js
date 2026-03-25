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
  const poorTomorrow = forecast72.slice(0, 12).some((value) => value > 120);
  const humid = humidity >= 70;
  const hot = temp >= 34;
  const dusty = pm25 >= 35;
  const calmAir = wind < 2;
  const polluted = aqi > 100;
  const veryPolluted = aqi > 150;

  advice.general.push(
    veryPolluted
      ? "Air quality is unhealthy right now, so outdoor exposure should be short and essential only."
      : polluted
        ? "Air quality is elevated, so it is smarter to keep outdoor activity moderate."
        : "Air quality is manageable for most people right now."
  );
  advice.general.push(
    dusty
      ? "PM2.5 is running high, so a mask helps if you need to be outside near roads or traffic."
      : "Particle levels are not extreme, but checking cleaner hours is still a smart habit."
  );
  advice.general.push(
    hot && humid
      ? "Heat and humidity are both high, so outdoor effort may feel heavier than usual."
      : hot
        ? "It is hot outside, so hydration and shorter exposure matter today."
        : "Weather stress is fairly manageable at the moment."
  );
  advice.general.push(`Current weather is ${weather}. The cleaner outdoor window starts around ${bestHourText}.`);
  advice.general.push(
    poorTomorrow
      ? "Forecast data suggests pollution may stay elevated later, so finishing outdoor tasks earlier is safer."
      : "Forecast conditions look relatively steady, so you have some flexibility if you plan around cleaner hours."
  );

  advice.asthma.push(
    pm25 > 40 || aqi > 120
      ? "Asthma triggers are elevated today, so keep rescue medication close and favor cleaner indoor air."
      : "Air quality is not at peak trigger level, but it is still wise to carry your inhaler if you are sensitive."
  );
  advice.asthma.push(
    calmAir
      ? "Low wind can trap pollution close to the ground, so avoid standing near traffic or bus stops for long."
      : `If you need outdoor time, aim for around ${bestHourText} when conditions are more favorable.`
  );
  advice.asthma.push(
    dusty
      ? "Keep windows closed during busier hours if indoor air starts to feel dusty or irritating."
      : "Short outdoor movement is safer away from congested roads and intersections."
  );
  advice.asthma.push(
    hot
      ? "Heat can add breathing stress, so slow your pace and avoid midday exposure."
      : "A short walk is better than prolonged outdoor activity if symptoms feel unstable."
  );
  advice.asthma.push(
    poorTomorrow
      ? "Because the forecast stays elevated, plan medicines, masks, and errands before air quality worsens."
      : "If symptoms are calm, light outdoor activity is best during the cleaner forecast window."
  );

  advice.runner.push(
    polluted
      ? "Outdoor running is not ideal right now, so an indoor workout or lower-intensity session is the safer call."
      : "Conditions are acceptable for a lighter outdoor run if you keep effort controlled."
  );
  advice.runner.push(`The best training window starts around ${bestHourText}, when AQI is expected to be lower.`);
  advice.runner.push(
    hot
      ? "Heat is high, so shorten the session and carry water instead of pushing pace."
      : "A warm-up indoors before heading out can reduce exposure time on the road."
  );
  advice.runner.push(
    dusty
      ? "Try routes away from traffic-heavy corridors because PM2.5 is elevated today."
      : "Quieter streets or parks are still a better pick than main roads."
  );
  advice.runner.push("If air quality rises during your workout, switch to recovery pace or end the session early.");

  advice.child.push(
    polluted
      ? "Children and older adults should keep outdoor exposure short during poor air periods today."
      : "Short outdoor time is okay, but it is still best to use the cleaner-hour window for play or walks."
  );
  advice.child.push(
    hot
      ? "Avoid outdoor play during peak heat because children and seniors dehydrate faster."
      : "Morning and evening remain the more comfortable windows for fresh air."
  );
  advice.child.push(
    dusty
      ? "Busy roads, school pickup zones, and traffic signals should be avoided when particles are elevated."
      : "Open parks and low-traffic streets are the better choice for outdoor time."
  );
  advice.child.push(
    calmAir
      ? "Still air can let pollution linger, so indoor breaks are important if irritation starts."
      : `If you need to go outside, around ${bestHourText} is a better time to do it.`
  );
  advice.child.push(
    poorTomorrow
      ? "If tomorrow also looks polluted, keep masks, water, and indoor alternatives ready in advance."
      : "Conditions are stable enough to plan short outdoor routines around the cleaner hours."
  );

  advice.pregnant.push("Use cleaner indoor spaces and avoid high-traffic roads whenever possible.");
  advice.pregnant.push(
    polluted
      ? "Because air quality is elevated, reduce unnecessary outdoor exposure and keep errands efficient."
      : `If you need to step out, around ${bestHourText} is a better outdoor window.`
  );
  advice.pregnant.push(
    hot && humid
      ? "Heat and humidity can add fatigue, so keep outdoor travel short and stay hydrated."
      : "Choose shaded, less crowded routes to reduce both air and heat stress."
  );
  advice.pregnant.push(
    dusty
      ? "A mask is worth considering if you must spend time near traffic or dusty roads."
      : "Short walks are better on quieter streets than near major intersections."
  );
  advice.pregnant.push(
    poorTomorrow
      ? "Forecast conditions may worsen later, so earlier appointments and travel are the safer option."
      : "Current forecast data is relatively steady, so you can plan around the cleaner part of the day."
  );

  return advice;
};
