import {
  AVAILABILITY_STATUS,
  checkProviderListingAvailability,
  classifyImovirtualAvailability,
  processProviderAvailabilityLeads,
  validateProviderListingUrl
} from "./availability";

function nextDataWithStatus(status, id = "1") {
  return `<script id="__NEXT_DATA__">${JSON.stringify({ props: { pageProps: { ad: { id, status } } } })}</script>`;
}

describe("provider availability", () => {
  test("keeps an active Imovirtual listing available", () => {
    expect(classifyImovirtualAvailability(nextDataWithStatus("active"), "1")).toEqual({
      status: AVAILABILITY_STATUS.AVAILABLE,
      reason: "ad_status_active"
    });
  });

  test("confirms an Imovirtual listing removed by the owner as unavailable", () => {
    expect(classifyImovirtualAvailability(nextDataWithStatus("removed_by_user"), "1")).toEqual({
      status: AVAILABILITY_STATUS.UNAVAILABLE,
      reason: "ad_status_removed_by_user"
    });
  });

  test.each([
    ["timeout", { name: "AbortError" }],
    ["request_error", new Error("network")]
  ])("does not inactivate a listing after %s", async (reason, error) => {
    const inactivateLead = jest.fn();
    const result = await checkProviderListingAvailability({
      provider: "imovirtual",
      url: "https://www.imovirtual.com/pt/anuncio/1",
      externalId: "1",
      fetchImpl: jest.fn().mockRejectedValue(error),
      timeoutMs: 1
    });

    expect(result).toEqual({ status: AVAILABILITY_STATUS.INCONCLUSIVE, reason });
    expect(inactivateLead).not.toHaveBeenCalled();
  });

  test("does not treat an HTTP error or unknown response as unavailable", async () => {
    const fetchImpl = jest.fn()
      .mockResolvedValueOnce({ ok: false, status: 404 })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        url: "https://www.imovirtual.com/pt/anuncio/1",
        text: async () => nextDataWithStatus("paused")
      });

    await expect(checkProviderListingAvailability({ provider: "imovirtual", externalId: "1", url: "https://www.imovirtual.com/pt/anuncio/1", fetchImpl }))
      .resolves.toEqual({ status: AVAILABILITY_STATUS.INCONCLUSIVE, reason: "http_error" });
    await expect(checkProviderListingAvailability({ provider: "imovirtual", externalId: "1", url: "https://www.imovirtual.com/pt/anuncio/1", fetchImpl }))
      .resolves.toEqual({ status: AVAILABILITY_STATUS.INCONCLUSIVE, reason: "missing_or_unknown_ad_status" });
  });

  test("does not inactivate a different or unidentifiable ad", () => {
    expect(classifyImovirtualAvailability(nextDataWithStatus("removed_by_user", "2"), "1").status)
      .toBe(AVAILABILITY_STATUS.INCONCLUSIVE);
    expect(classifyImovirtualAvailability(nextDataWithStatus("removed_by_user", null), "1").status)
      .toBe(AVAILABILITY_STATUS.INCONCLUSIVE);
  });

  test("validates only the proven Imovirtual detail host and rejects credentials", () => {
    expect(validateProviderListingUrl("imovirtual", "https://www.imovirtual.com/pt/anuncio/1").valid).toBe(true);
    expect(validateProviderListingUrl("imovirtual", "http://www.imovirtual.com/pt/anuncio/1").valid).toBe(false);
    expect(validateProviderListingUrl("imovirtual", "https://evil.test/pt/anuncio/1").valid).toBe(false);
    expect(validateProviderListingUrl("imovirtual", "https://user:pass@www.imovirtual.com/pt/anuncio/1").valid).toBe(false);
  });

  test("does not follow redirects", async () => {
    const fetchImpl = jest.fn().mockResolvedValue({ status: 302, ok: false, headers: new Headers() });
    await expect(checkProviderListingAvailability({
      provider: "imovirtual",
      externalId: "1",
      url: "https://www.imovirtual.com/pt/anuncio/1",
      fetchImpl
    })).resolves.toEqual({ status: AVAILABILITY_STATUS.INCONCLUSIVE, reason: "unexpected_redirect" });
    expect(fetchImpl.mock.calls[0][1]).toMatchObject({ redirect: "manual" });
  });

  test("does not inactivate unsupported providers without a conclusive status parser", async () => {
    const inactivateLead = jest.fn();
    const result = await processProviderAvailabilityLeads([
      { id: "cj-1", provider: "custojusto", external_id: "1", provider_active: true }
    ], {
      checkAvailability: checkProviderListingAvailability,
      inactivateLead
    });

    expect(result.counts).toEqual({ checked: 1, available: 0, inactivated: 0, inconclusive: 1, errors: 0 });
    expect(inactivateLead).not.toHaveBeenCalled();
  });

  test("skips already inactive listings, continues after an individual error, and counts the run", async () => {
    const inactivateLead = jest.fn().mockResolvedValue(true);
    const result = await processProviderAvailabilityLeads([
      { id: "inactive", provider: "imovirtual", external_id: "0", provider_active: false },
      { id: "available", provider: "imovirtual", external_id: "1", provider_active: true },
      { id: "unavailable", provider: "imovirtual", external_id: "2", provider_active: true },
      { id: "error", provider: "imovirtual", external_id: "3", provider_active: true }
    ], {
      checkAvailability: jest.fn()
        .mockResolvedValueOnce({ status: AVAILABILITY_STATUS.AVAILABLE, reason: "active" })
        .mockResolvedValueOnce({ status: AVAILABILITY_STATUS.UNAVAILABLE, reason: "removed" })
        .mockRejectedValueOnce(new Error("provider failure")),
      inactivateLead
    });

    expect(result.counts).toEqual({ checked: 3, available: 1, inactivated: 1, inconclusive: 0, errors: 1 });
    expect(result.omittedErrors).toBe(0);
    expect(inactivateLead).toHaveBeenCalledTimes(1);
  });

  test("keeps concurrent work bounded and records only a bounded error sample", async () => {
    let inFlight = 0;
    let peakInFlight = 0;
    const result = await processProviderAvailabilityLeads(
      Array.from({ length: 55 }, (_, index) => ({
        id: `error-${index}`,
        provider: "imovirtual",
        external_id: String(index),
        provider_active: true
      })),
      {
        concurrency: 4,
        checkAvailability: async () => {
          inFlight += 1;
          peakInFlight = Math.max(peakInFlight, inFlight);
          await Promise.resolve();
          inFlight -= 1;
          throw new Error("provider failure");
        }
      }
    );

    expect(peakInFlight).toBeLessThanOrEqual(4);
    expect(result.counts.errors).toBe(55);
    expect(result.errors).toHaveLength(50);
    expect(result.omittedErrors).toBe(5);
  });
    test("aborts the run when the lease is lost during availability checking", async () => {
    const checkAvailability = jest.fn().mockRejectedValue(
      new Error("availability_run_lease_lost")
    );
    const inactivateLead = jest.fn();

    await expect(processProviderAvailabilityLeads(
      [
        { id: "1", provider: "imovirtual", external_id: "1", provider_active: true },
        { id: "2", provider: "imovirtual", external_id: "2", provider_active: true },
        { id: "3", provider: "imovirtual", external_id: "3", provider_active: true }
      ],
      {
        concurrency: 1,
        checkAvailability,
        inactivateLead
      }
    )).rejects.toThrow("availability_run_lease_lost");

    expect(checkAvailability).toHaveBeenCalledTimes(1);
    expect(inactivateLead).not.toHaveBeenCalled();
  });

  test("aborts the run when the lease is lost during inactivation", async () => {
    const checkAvailability = jest.fn().mockResolvedValue({
      status: AVAILABILITY_STATUS.UNAVAILABLE,
      reason: "removed"
    });

    const inactivateLead = jest.fn().mockRejectedValue(
      new Error("availability_run_lease_lost")
    );

    await expect(processProviderAvailabilityLeads(
      [
        { id: "1", provider: "imovirtual", external_id: "1", provider_active: true },
        { id: "2", provider: "imovirtual", external_id: "2", provider_active: true }
      ],
      {
        concurrency: 1,
        checkAvailability,
        inactivateLead
      }
    )).rejects.toThrow("availability_run_lease_lost");

    expect(checkAvailability).toHaveBeenCalledTimes(1);
    expect(inactivateLead).toHaveBeenCalledTimes(1);
  });

  test("does not start new inactivations after another worker loses the lease", async () => {
    let started = 0;
    let releaseFirst;
    let releaseSecond;

    const firstCheck = new Promise((_, reject) => {
      releaseFirst = reject;
    });

    const secondCheck = new Promise((resolve) => {
      releaseSecond = resolve;
    });

    const checkAvailability = jest.fn((lead) => {
      started += 1;

      if (lead.id === "1") return firstCheck;
      if (lead.id === "2") return secondCheck;

      return Promise.resolve({
        status: AVAILABILITY_STATUS.UNAVAILABLE,
        reason: "removed"
      });
    });

    const inactivateLead = jest.fn().mockResolvedValue(true);

    const run = processProviderAvailabilityLeads(
      [
        { id: "1", provider: "imovirtual", external_id: "1", provider_active: true },
        { id: "2", provider: "imovirtual", external_id: "2", provider_active: true },
        { id: "3", provider: "imovirtual", external_id: "3", provider_active: true }
      ],
      {
        concurrency: 2,
        checkAvailability,
        inactivateLead
      }
    );

    while (started < 2) {
      await Promise.resolve();
    }

    releaseFirst(new Error("availability_run_lease_lost"));

    await Promise.resolve();

    releaseSecond({
      status: AVAILABILITY_STATUS.UNAVAILABLE,
      reason: "removed"
    });

    await expect(run).rejects.toThrow("availability_run_lease_lost");

    expect(checkAvailability).toHaveBeenCalledTimes(2);
    expect(inactivateLead).not.toHaveBeenCalled();
  });

  describe("Imovirtual extended availability", () => {
    const url = "https://www.imovirtual.com/hpr/pt/anuncio/t3-exemplo-ID1iAMi";

    test("accepts the HPR detail URL format", () => {
      const result = validateProviderListingUrl("imovirtual", url);

      expect(result.valid).toBe(true);
      expect(result.listingIdentity).toBe("ID1IAMI");
    });

    test("classifies HTTP 410 on the original validated URL as unavailable", async () => {
      const fetchImpl = jest.fn().mockResolvedValue({
        status: 410,
        ok: false,
        url
      });

      await expect(checkProviderListingAvailability({
        provider: "imovirtual",
        externalId: "91920761800067",
        url,
        fetchImpl
      })).resolves.toEqual({
        status: AVAILABILITY_STATUS.UNAVAILABLE,
        reason: "imovirtual_http_410_confirmed_listing_url"
      });
    });

    test("does not classify HTTP 410 from a different response URL as unavailable", async () => {
      const fetchImpl = jest.fn().mockResolvedValue({
        status: 410,
        ok: false,
        url: "https://www.imovirtual.com/pt/anuncio/outro-ID999"
      });

      await expect(checkProviderListingAvailability({
        provider: "imovirtual",
        externalId: "91920761800067",
        url,
        fetchImpl
      })).resolves.toEqual({
        status: AVAILABILITY_STATUS.INCONCLUSIVE,
        reason: "unexpected_response_url"
      });
    });

    test("keeps the two external ID formats dependent on the returned ad identity", () => {
      expect(classifyImovirtualAvailability(
        nextDataWithStatus("active", "91920761800067"),
        "91920761800067"
      ).status).toBe(AVAILABILITY_STATUS.AVAILABLE);

      expect(classifyImovirtualAvailability(
        nextDataWithStatus("removed_by_user", "19207618"),
        "91920761800067"
      ).status).toBe(AVAILABILITY_STATUS.INCONCLUSIVE);
    });
  });

  describe("CustoJusto availability", () => {
    const detailUrl = "https://www.custojusto.pt/porto/imobiliario/apartamentos/apartamento-t1-1-totalmente--45143911";
    const goneUrl = "https://www.custojusto.pt/porto/imobiliario/apartamentos?gone=45143911";

    test("validates the normal listing URL and its numeric identity", () => {
      const result = validateProviderListingUrl("custojusto", detailUrl);

      expect(result.valid).toBe(true);
      expect(result.listingIdentity).toBe("45143911");
    });

    test("validates the gone URL using its query parameter identity", () => {
      const result = validateProviderListingUrl("custojusto", goneUrl);

      expect(result.valid).toBe(true);
      expect(result.listingIdentity).toBe("45143911");
    });

    test("classifies the explicit inactive message as unavailable", async () => {
      const fetchImpl = jest.fn().mockResolvedValue({
        status: 200,
        ok: true,
        url: goneUrl,
        text: async () => "<html><body>O anúncio que procura já não está activo!</body></html>"
      });

      await expect(checkProviderListingAvailability({
        provider: "custojusto",
        externalId: "45143911",
        url: goneUrl,
        fetchImpl
      })).resolves.toEqual({
        status: AVAILABILITY_STATUS.UNAVAILABLE,
        reason: "custojusto_explicit_unavailable_message"
      });
    });

    test("does not classify a different external ID as unavailable", async () => {
      const fetchImpl = jest.fn();

      await expect(checkProviderListingAvailability({
        provider: "custojusto",
        externalId: "99999999",
        url: goneUrl,
        fetchImpl
      })).resolves.toEqual({
        status: AVAILABILITY_STATUS.INCONCLUSIVE,
        reason: "ad_identity_mismatch"
      });

      expect(fetchImpl).not.toHaveBeenCalled();
    });

    test("keeps an unknown CustoJusto page inconclusive", async () => {
      const fetchImpl = jest.fn().mockResolvedValue({
        status: 200,
        ok: true,
        url: detailUrl,
        text: async () => "<html><body>Outros anúncios disponíveis</body></html>"
      });

      await expect(checkProviderListingAvailability({
        provider: "custojusto",
        externalId: "45143911",
        url: detailUrl,
        fetchImpl
      })).resolves.toEqual({
        status: AVAILABILITY_STATUS.INCONCLUSIVE,
        reason: "custojusto_status_not_confirmed"
      });
    });
  });

  describe("OLX availability", () => {
    const url = "https://www.olx.pt/d/anuncio/aluga-apartamento-t2-1-IDJxER1.html";

    test("validates the OLX listing identity", () => {
      const result = validateProviderListingUrl("olx", url);

      expect(result.valid).toBe(true);
      expect(result.listingIdentity).toBe("IDJXER1");
    });

    test("classifies an explicit removal message as unavailable", async () => {
      const fetchImpl = jest.fn().mockResolvedValue({
        status: 200,
        ok: true,
        url,
        text: async () => "<html><body>Este anúncio já não está disponível.</body></html>"
      });

      await expect(checkProviderListingAvailability({
        provider: "olx",
        externalId: "IDJxER1",
        url,
        fetchImpl
      })).resolves.toEqual({
        status: AVAILABILITY_STATUS.UNAVAILABLE,
        reason: "olx_explicit_unavailable_message"
      });
    });

    test("keeps an active or unrecognized OLX page inconclusive", async () => {
      const fetchImpl = jest.fn().mockResolvedValue({
        status: 200,
        ok: true,
        url,
        text: async () => "<html><body>Detalhes do anúncio e contacto do vendedor</body></html>"
      });

      await expect(checkProviderListingAvailability({
        provider: "olx",
        externalId: "IDJxER1",
        url,
        fetchImpl
      })).resolves.toEqual({
        status: AVAILABILITY_STATUS.INCONCLUSIVE,
        reason: "olx_status_not_confirmed"
      });
    });

    test("does not fetch when the OLX external ID differs from the URL", async () => {
      const fetchImpl = jest.fn();

      await expect(checkProviderListingAvailability({
        provider: "olx",
        externalId: "IDJzGGv",
        url,
        fetchImpl
      })).resolves.toEqual({
        status: AVAILABILITY_STATUS.INCONCLUSIVE,
        reason: "ad_identity_mismatch"
      });

      expect(fetchImpl).not.toHaveBeenCalled();
    });
  });

  
  describe("HTTP 410 identity security", () => {
    test.each([
      {
        name: "missing response URL",
        provider: "imovirtual",
        externalId: "1",
        url: "https://www.imovirtual.com/pt/anuncio/1",
        responseUrl: undefined
      },
      {
        name: "different listing path",
        provider: "imovirtual",
        externalId: "1",
        url: "https://www.imovirtual.com/pt/anuncio/1",
        responseUrl: "https://www.imovirtual.com/pt/anuncio/2"
      },
      {
        name: "different domain",
        provider: "imovirtual",
        externalId: "1",
        url: "https://www.imovirtual.com/pt/anuncio/1",
        responseUrl: "https://evil.test/pt/anuncio/1"
      },
      {
        name: "different CustoJusto gone identity",
        provider: "custojusto",
        externalId: "45143911",
        url: "https://www.custojusto.pt/porto/imobiliario/apartamentos?gone=45143911",
        responseUrl: "https://www.custojusto.pt/porto/imobiliario/apartamentos?gone=99999999"
      }
    ])("does not inactivate when HTTP 410 has $name", async ({
      provider,
      externalId,
      url,
      responseUrl
    }) => {
      const fetchImpl = jest.fn().mockResolvedValue({
        status: 410,
        ok: false,
        url: responseUrl || ""
      });

      const inactivateLead = jest.fn().mockResolvedValue(true);

      const result = await processProviderAvailabilityLeads([
        {
          id: "security-test",
          provider,
          external_id: externalId,
          url,
          provider_active: true
        }
      ], {
        checkAvailability: (lead) => checkProviderListingAvailability({
          provider: lead.provider,
          externalId: lead.external_id,
          url: lead.url,
          fetchImpl
        }),
        inactivateLead
      });

      expect(result.counts).toEqual({
        checked: 1,
        available: 0,
        inactivated: 0,
        inconclusive: 1,
        errors: 0
      });

      expect(inactivateLead).not.toHaveBeenCalled();
    });
  });
describe("HTTP 410 and 404 safety", () => {
    test.each(["custojusto", "olx"])(
      "does not treat HTTP 404 as unavailable for %s",
      async (provider) => {
        const url = provider === "olx"
          ? "https://www.olx.pt/d/anuncio/aluga-apartamento-t2-1-IDJxER1.html"
          : "https://www.custojusto.pt/porto/imobiliario/apartamentos/apartamento-t1-1-totalmente--45143911";

        const externalId = provider === "olx" ? "IDJxER1" : "45143911";

        const fetchImpl = jest.fn().mockResolvedValue({
          status: 404,
          ok: false,
          url
        });

        await expect(checkProviderListingAvailability({
          provider,
          externalId,
          url,
          fetchImpl
        })).resolves.toEqual({
          status: AVAILABILITY_STATUS.INCONCLUSIVE,
          reason: "http_error"
        });
      }
    );

    test.each(["custojusto", "olx"])(
      "classifies HTTP 410 on the original URL as unavailable for %s",
      async (provider) => {
        const url = provider === "olx"
          ? "https://www.olx.pt/d/anuncio/aluga-apartamento-t2-1-IDJxER1.html"
          : "https://www.custojusto.pt/porto/imobiliario/apartamentos/apartamento-t1-1-totalmente--45143911";

        const externalId = provider === "olx" ? "IDJxER1" : "45143911";

        const fetchImpl = jest.fn().mockResolvedValue({
          status: 410,
          ok: false,
          url
        });

        await expect(checkProviderListingAvailability({
          provider,
          externalId,
          url,
          fetchImpl
        })).resolves.toEqual({
          status: AVAILABILITY_STATUS.UNAVAILABLE,
          reason: `${provider}_http_410_confirmed_listing_url`
        });
      }
    );
  });
});

